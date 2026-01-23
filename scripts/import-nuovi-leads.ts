/**
 * Import script for tab-separated lead data (Nuovi.txt format)
 * 
 * Format: Date\tName\tAssignee\tCourse\t\t\tContacted\tReplied\tAppointment\tEnrolled\t\tRevenue
 * 
 * Features:
 * - Deduplicates by name, keeping the most advanced status
 * - Does NOT create new courses (skips if course not found)
 * - Auto-fills revenue from course price if enrolled
 * 
 * Usage: npx tsx scripts/import-nuovi-leads.ts <file-path> [--dry-run]
 */

import { PrismaClient, LeadStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ParsedLead {
  rowNumber: number;
  date: Date;
  name: string;
  assigneeName: string;
  courseName: string;
  contacted: boolean;
  replied: boolean;
  appointment: boolean;
  enrolled: boolean;
  revenueFromFile: number;
}

// Status priority for deduplication (higher = more advanced)
function getStatusPriority(lead: ParsedLead): number {
  if (lead.enrolled) return 4;
  if (lead.appointment) return 3;
  if (lead.contacted) return 2;
  return 1;
}

interface ImportResult {
  success: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

// Parse DD/MM/YYYY to Date
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.trim().split('/').map(Number);
  return new Date(year, month - 1, day);
}

// Parse SI/NO to boolean
function parseSiNo(value: string): boolean {
  return value?.trim().toUpperCase() === 'SI';
}

// Derive status from flags
function deriveStatus(contacted: boolean, appointment: boolean, enrolled: boolean): LeadStatus {
  if (enrolled) return 'ISCRITTO';
  if (appointment) return 'IN_TRATTATIVA';
  if (contacted) return 'CONTATTATO';
  return 'NUOVO';
}

// Parse a single line
function parseLine(line: string, rowNumber: number): ParsedLead | null {
  const cols = line.split('\t');
  
  // Minimum columns needed: date, name, assignee, course
  if (cols.length < 4 || !cols[0]?.trim() || !cols[1]?.trim()) {
    return null;
  }

  const date = parseDate(cols[0]);
  const name = cols[1]?.trim();
  const assigneeName = cols[2]?.trim() || '';
  const courseName = cols[3]?.trim() || '';
  
  // Columns 4-6 are empty in the format
  // Column 7 = Contacted, 8 = Replied, 9 = Appointment, 10 = Enrolled, 11 = empty, 12 = Revenue
  const contacted = parseSiNo(cols[7] || '');
  const replied = parseSiNo(cols[8] || '');
  const appointment = parseSiNo(cols[9] || '');
  const enrolled = parseSiNo(cols[10] || '');
  const revenueFromFile = parseFloat(cols[12] || '0') || 0;

  if (!name) return null;

  return {
    rowNumber,
    date,
    name,
    assigneeName,
    courseName,
    contacted,
    replied,
    appointment,
    enrolled,
    revenueFromFile,
  };
}

async function importLeads(filePath: string, dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = { success: 0, skipped: 0, errors: [] };

  // Read file
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  console.log(`📄 Found ${lines.length} lines in file`);

  // Load lookup data
  const [courses, users] = await Promise.all([
    prisma.course.findMany({ select: { id: true, name: true, price: true } }),
    prisma.user.findMany({ 
      where: { role: 'COMMERCIAL' }, 
      select: { id: true, name: true, username: true } 
    }),
  ]);

  // Create lookup maps (case-insensitive)
  const courseMap = new Map<string, { id: string; price: number }>();
  courses.forEach(c => {
    courseMap.set(c.name.toLowerCase().trim(), { id: c.id, price: Number(c.price) });
  });

  // Course name aliases (map common variations to actual DB names)
  const courseAliases: Record<string, string> = {
    'masterclass game design': 'masterclass in game design',
  };
  for (const [alias, real] of Object.entries(courseAliases)) {
    const realCourse = courseMap.get(real);
    if (realCourse) {
      courseMap.set(alias, realCourse);
    }
  }

  const userMap = new Map<string, string>();
  users.forEach(u => {
    userMap.set(u.name.toLowerCase().trim(), u.id);
    // Also map first name only (e.g., "Simone" -> simone.'s ID)
    const firstName = u.name.split(' ')[0].toLowerCase().trim();
    if (!userMap.has(firstName)) {
      userMap.set(firstName, u.id);
    }
  });

  console.log(`📚 Loaded ${courses.length} courses, ${users.length} commercials`);
  console.log(`👥 Commercial mapping: ${Array.from(userMap.keys()).join(', ')}`);

  // Parse all lines
  const parsedLeads: ParsedLead[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i], i + 1);
    if (parsed) {
      parsedLeads.push(parsed);
    } else {
      result.errors.push({ row: i + 1, message: 'Could not parse line' });
    }
  }

  console.log(`✅ Parsed ${parsedLeads.length} leads`);

  // Deduplicate by name - keep the most advanced status
  const leadsByName = new Map<string, ParsedLead[]>();
  parsedLeads.forEach(l => {
    const key = l.name.toLowerCase().trim();
    if (!leadsByName.has(key)) leadsByName.set(key, []);
    leadsByName.get(key)!.push(l);
  });

  const deduplicatedLeads: ParsedLead[] = [];
  const duplicatesRemoved: { name: string; kept: number; removed: number[] }[] = [];

  for (const [name, leads] of leadsByName) {
    if (leads.length === 1) {
      deduplicatedLeads.push(leads[0]);
    } else {
      // Sort by status priority (desc) then by date (desc) to get the best one
      leads.sort((a, b) => {
        const priorityDiff = getStatusPriority(b) - getStatusPriority(a);
        if (priorityDiff !== 0) return priorityDiff;
        return b.date.getTime() - a.date.getTime();
      });
      const best = leads[0];
      deduplicatedLeads.push(best);
      duplicatesRemoved.push({
        name,
        kept: best.rowNumber,
        removed: leads.slice(1).map(l => l.rowNumber)
      });
    }
  }

  if (duplicatesRemoved.length > 0) {
    console.log(`\n🔄 Deduplicated ${duplicatesRemoved.length} names (keeping most advanced status):`);
    duplicatesRemoved.forEach(d => {
      console.log(`   "${d.name}": kept row ${d.kept}, removed rows ${d.removed.join(', ')}`);
    });
  }

  console.log(`\n📋 After deduplication: ${deduplicatedLeads.length} unique leads`);

  // Use deduplicated list from now on
  const leadsToImport = deduplicatedLeads;

  // Summary before import (using deduplicated list)
  const stats = {
    total: leadsToImport.length,
    enrolled: leadsToImport.filter(l => l.enrolled).length,
    inTrattativa: leadsToImport.filter(l => l.appointment && !l.enrolled).length,
    contacted: leadsToImport.filter(l => l.contacted && !l.appointment && !l.enrolled).length,
    nuovo: leadsToImport.filter(l => !l.contacted).length,
    withRevenue: leadsToImport.filter(l => l.revenueFromFile > 0).length,
  };

  console.log(`\n📊 Summary:`);
  console.log(`   Total: ${stats.total}`);
  console.log(`   ISCRITTO (enrolled): ${stats.enrolled}`);
  console.log(`   IN_TRATTATIVA (appointment): ${stats.inTrattativa}`);
  console.log(`   CONTATTATO: ${stats.contacted}`);
  console.log(`   NUOVO: ${stats.nuovo}`);
  console.log(`   With revenue in file: ${stats.withRevenue}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN - No data will be imported`);
    console.log(`\nSample leads to import:`);
    leadsToImport.slice(0, 5).forEach(l => {
      const status = deriveStatus(l.contacted, l.appointment, l.enrolled);
      const course = courseMap.get(l.courseName.toLowerCase());
      const userId = userMap.get(l.assigneeName.toLowerCase());
      console.log(`   Row ${l.rowNumber}: ${l.name}`);
      console.log(`      Date: ${l.date.toISOString().split('T')[0]}`);
      console.log(`      Course: ${l.courseName} -> ${course ? `✓ (€${course.price})` : '❌ WILL SKIP'}`);
      console.log(`      Assignee: ${l.assigneeName} -> ${userId ? '✓' : '❌ NOT FOUND'}`);
      console.log(`      Status: ${status}`);
      console.log(`      Revenue: ${l.revenueFromFile > 0 ? `€${l.revenueFromFile} (from file)` : (l.enrolled && course ? `€${course.price} (from course)` : 'none')}`);
    });
    
    // Show unmatched courses (will be SKIPPED, not created)
    const unmatchedCourses = new Set<string>();
    leadsToImport.forEach(l => {
      if (!courseMap.get(l.courseName.toLowerCase())) {
        unmatchedCourses.add(l.courseName);
      }
    });
    if (unmatchedCourses.size > 0) {
      console.log(`\n❌ Unmatched courses (leads will be SKIPPED):`);
      unmatchedCourses.forEach(c => console.log(`   - "${c}"`));
    } else {
      console.log(`\n✅ All courses matched!`);
    }

    // Show unmatched assignees
    const unmatchedAssignees = new Set<string>();
    leadsToImport.forEach(l => {
      if (l.assigneeName && !userMap.get(l.assigneeName.toLowerCase())) {
        unmatchedAssignees.add(l.assigneeName);
      }
    });
    if (unmatchedAssignees.size > 0) {
      console.log(`\n⚠️  Unmatched assignees (leads will be unassigned):`);
      unmatchedAssignees.forEach(a => console.log(`   - "${a}"`));
    }

    result.success = leadsToImport.length;
    return result;
  }

  // Actual import
  console.log(`\n🚀 Starting import of ${leadsToImport.length} leads...`);
  
  for (const lead of leadsToImport) {
    try {
      // Find course (DO NOT create new courses)
      const courseData = courseMap.get(lead.courseName.toLowerCase());
      if (!courseData) {
        result.errors.push({ row: lead.rowNumber, message: `Course not found: "${lead.courseName}"` });
        result.skipped++;
        continue;
      }

      // Find assignee
      const assignedToId = userMap.get(lead.assigneeName.toLowerCase()) || null;

      // Derive status
      const status = deriveStatus(lead.contacted, lead.appointment, lead.enrolled);

      // Calculate revenue
      let revenue: number | null = null;
      if (lead.revenueFromFile > 0) {
        revenue = lead.revenueFromFile;
      } else if (lead.enrolled && courseData.price > 0) {
        revenue = courseData.price;
      }

      // Create lead
      await prisma.lead.create({
        data: {
          name: lead.name,
          courseId: courseData.id,
          assignedToId,
          status,
          contacted: lead.contacted,
          contactedAt: lead.contacted ? lead.date : null,
          enrolled: lead.enrolled,
          enrolledAt: lead.enrolled ? lead.date : null,
          revenue: revenue,
          source: 'LEGACY_IMPORT',
          createdAt: lead.date,
          notes: lead.replied ? 'Ha risposto' : null,
        }
      });

      result.success++;
    } catch (error) {
      result.errors.push({ 
        row: lead.rowNumber, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Skipped: ${result.skipped}`);
  console.log(`   Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    result.errors.slice(0, 10).forEach(e => console.log(`   Row ${e.row}: ${e.message}`));
    if (result.errors.length > 10) {
      console.log(`   ... and ${result.errors.length - 10} more`);
    }
  }

  return result;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find(a => !a.startsWith('--')) || '';
  const dryRun = args.includes('--dry-run');

  if (!filePath) {
    console.log('Usage: npx tsx scripts/import-nuovi-leads.ts <file-path> [--dry-run]');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run    Preview import without making changes');
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`📁 File: ${resolvedPath}`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`);
  console.log('');

  try {
    await importLeads(resolvedPath, dryRun);
  } finally {
    await prisma.$disconnect();
  }
}

main();
