/**
 * Final verification before import/update
 * 
 * Actions:
 * 1. Import 147 new leads (155 - 8 empty courses)
 * 2. Update 48 commercial assignments
 * 3. Update 35 status changes (NUOVO → CONTATTATO)
 * 4. DO NOT update enrollment status
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function normalizeString(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim();
}

// Course name mapping
const COURSE_MAPPING: Record<string, string> = {
  'masterclass game design': 'Masterclass in Game Design'
};

async function main() {
  console.log('=== FINAL VERIFICATION BEFORE IMPORT/UPDATE ===\n');

  // Get existing data from DB
  const [courses, users, dbLeads] = await Promise.all([
    prisma.course.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ 
      where: { role: 'COMMERCIAL' },
      select: { id: true, name: true } 
    }),
    prisma.lead.findMany({
      where: {
        createdAt: { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') }
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        course: { select: { name: true } }
      }
    })
  ]);

  // Create lookup maps
  const courseMap = new Map<string, string>();
  courses.forEach(c => courseMap.set(c.name.toLowerCase().trim(), c.id));
  
  // Add course mappings
  for (const [alias, real] of Object.entries(COURSE_MAPPING)) {
    const realId = courseMap.get(real.toLowerCase().trim());
    if (realId) courseMap.set(alias, realId);
  }

  const userMap = new Map<string, string>();
  users.forEach(u => {
    userMap.set(u.name.toLowerCase().trim(), u.id);
    const firstName = u.name.split(' ')[0].toLowerCase().trim();
    if (!userMap.has(firstName)) userMap.set(firstName, u.id);
  });

  const dbLeadMap = new Map<string, typeof dbLeads[0]>();
  dbLeads.forEach(l => dbLeadMap.set(normalizeString(l.name), l));

  // Read CSV
  const csv = fs.readFileSync('C:/Users/ferna/Downloads/Dashboard_Commerciale_Formazione (4) - Dati (3).csv', 'utf-8');
  const lines = csv.split('\n').slice(1);

  // Parse January 2026 leads
  interface CSVLead {
    date: string;
    name: string;
    commercial: string;
    course: string;
    contattati: string;
    iscrizioni: string;
    ricavi: string;
    row: number;
  }
  
  const csvLeads: CSVLead[] = [];
  lines.forEach((line, idx) => {
    const parts = line.split(',');
    const date = parts[0]?.trim();
    const name = parts[1]?.trim();
    
    if (date && date.match(/\/01\/2026/) && name) {
      csvLeads.push({
        date,
        name,
        commercial: parts[2]?.trim() || '',
        course: parts[3]?.trim() || '',
        contattati: parts[8]?.trim() || '',
        iscrizioni: parts[10]?.trim() || '',
        ricavi: parts[12]?.trim() || '0',
        row: idx + 2
      });
    }
  });

  // Categorize leads
  const leadsToImport: CSVLead[] = [];
  const leadsToSkip: { lead: CSVLead; reason: string }[] = [];
  const commercialUpdates: { name: string; dbId: string; dbCommercial: string; csvCommercial: string; newUserId: string }[] = [];
  const statusUpdates: { name: string; dbId: string }[] = [];
  const enrolledInCsvOnly: CSVLead[] = []; // For reference

  for (const csvLead of csvLeads) {
    const key = normalizeString(csvLead.name);
    const dbLead = dbLeadMap.get(key);

    if (!dbLead) {
      // New lead - check if it should be imported
      if (!csvLead.course) {
        leadsToSkip.push({ lead: csvLead, reason: 'Empty course' });
      } else {
        const courseKey = csvLead.course.toLowerCase().trim();
        const mappedCourse = COURSE_MAPPING[courseKey];
        const courseId = courseMap.get(mappedCourse?.toLowerCase().trim() || courseKey);
        
        if (!courseId) {
          leadsToSkip.push({ lead: csvLead, reason: `Unknown course: ${csvLead.course}` });
        } else {
          leadsToImport.push(csvLead);
        }
      }
    } else {
      // Existing lead - check for updates
      
      // Commercial update?
      const csvCommercial = normalizeString(csvLead.commercial);
      const dbCommercialFirstName = normalizeString(dbLead.assignedTo?.name?.split(' ')[0]);
      if (csvCommercial && dbCommercialFirstName && csvCommercial !== dbCommercialFirstName) {
        const newUserId = userMap.get(csvCommercial);
        if (newUserId && newUserId !== dbLead.assignedTo?.id) {
          commercialUpdates.push({
            name: csvLead.name,
            dbId: dbLead.id,
            dbCommercial: dbLead.assignedTo?.name || 'unassigned',
            csvCommercial: csvLead.commercial,
            newUserId
          });
        }
      }

      // Status update? (NUOVO → CONTATTATO)
      const csvContacted = csvLead.contattati.toUpperCase() === 'SI';
      if (csvContacted && dbLead.status === 'NUOVO') {
        statusUpdates.push({
          name: csvLead.name,
          dbId: dbLead.id
        });
      }

      // Track enrolled in CSV but not in DB (for reference only - won't update)
      const csvEnrolled = csvLead.iscrizioni.toUpperCase() === 'SI';
      if (csvEnrolled && !dbLead.enrolled) {
        enrolledInCsvOnly.push(csvLead);
      }
    }
  }

  // Print results
  console.log('=== LEADS TO IMPORT (NEW) ===');
  console.log(`Total: ${leadsToImport.length}\n`);
  
  // Group by course
  const byCourse: Record<string, number> = {};
  leadsToImport.forEach(l => {
    const course = COURSE_MAPPING[l.course.toLowerCase().trim()] || l.course;
    byCourse[course] = (byCourse[course] || 0) + 1;
  });
  Object.entries(byCourse).sort((a, b) => b[1] - a[1]).forEach(([course, count]) => {
    console.log(`  ${count}x ${course}`);
  });

  // Enrolled new leads
  const enrolledNew = leadsToImport.filter(l => l.iscrizioni.toUpperCase() === 'SI');
  if (enrolledNew.length > 0) {
    console.log(`\nEnrolled leads to import (${enrolledNew.length}):`);
    enrolledNew.forEach(l => {
      console.log(`  ${l.name} | ${l.course} | ${l.commercial} | Ricavi: ${l.ricavi}`);
    });
  }

  console.log('\n\n=== LEADS TO SKIP ===');
  console.log(`Total: ${leadsToSkip.length}\n`);
  leadsToSkip.forEach(({ lead, reason }) => {
    console.log(`  ${lead.name} | ${reason}`);
  });

  console.log('\n\n=== COMMERCIAL UPDATES ===');
  console.log(`Total: ${commercialUpdates.length}\n`);
  commercialUpdates.slice(0, 20).forEach(u => {
    console.log(`  ${u.name}: "${u.dbCommercial}" → "${u.csvCommercial}"`);
  });
  if (commercialUpdates.length > 20) {
    console.log(`  ... and ${commercialUpdates.length - 20} more`);
  }

  console.log('\n\n=== STATUS UPDATES (NUOVO → CONTATTATO) ===');
  console.log(`Total: ${statusUpdates.length}\n`);
  statusUpdates.slice(0, 20).forEach(u => {
    console.log(`  ${u.name}`);
  });
  if (statusUpdates.length > 20) {
    console.log(`  ... and ${statusUpdates.length - 20} more`);
  }

  console.log('\n\n=== FOR REFERENCE: ENROLLED IN CSV, NOT IN DB (NOT UPDATING) ===');
  console.log(`Total: ${enrolledInCsvOnly.length}\n`);
  enrolledInCsvOnly.forEach(l => {
    console.log(`  ${l.name} | ${l.course} | Ricavi: ${l.ricavi}`);
  });

  // Final summary
  console.log('\n\n========================================');
  console.log('FINAL SUMMARY');
  console.log('========================================');
  console.log(`\nNew leads to import: ${leadsToImport.length}`);
  console.log(`Leads to skip: ${leadsToSkip.length}`);
  console.log(`Commercial updates: ${commercialUpdates.length}`);
  console.log(`Status updates: ${statusUpdates.length}`);
  console.log(`\nEnrollment updates: 0 (keeping DB values)`);

  await prisma.$disconnect();
}

main().catch(console.error);
