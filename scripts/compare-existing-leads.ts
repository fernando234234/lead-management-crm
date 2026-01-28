/**
 * Compare existing January 2026 leads in DB with CSV to find updates/changes
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface CSVLead {
  date: string;
  name: string;
  commercial: string;
  course: string;
  contattati: string;
  iscrizioni: string;
  ricavi: string;
}

interface DBLead {
  id: string;
  name: string;
  commercial: string | null;
  course: string | null;
  status: string;
  enrolled: boolean;
  revenue: number | null;
}

function normalizeString(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim();
}

async function main() {
  console.log('=== Comparing Existing DB Leads with CSV ===\n');

  // Get existing January 2026 leads from DB with all relevant data
  const dbLeads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') }
    },
    include: {
      assignedTo: { select: { name: true } },
      course: { select: { name: true } }
    }
  });

  console.log(`DB leads in January 2026: ${dbLeads.length}`);

  // Create a map of DB leads by normalized name
  const dbLeadMap = new Map<string, DBLead[]>();
  dbLeads.forEach(l => {
    const key = normalizeString(l.name);
    const entry: DBLead = {
      id: l.id,
      name: l.name,
      commercial: l.assignedTo?.name || null,
      course: l.course?.name || null,
      status: l.status,
      enrolled: l.enrolled,
      revenue: l.revenue ? Number(l.revenue) : null
    };
    if (!dbLeadMap.has(key)) dbLeadMap.set(key, []);
    dbLeadMap.get(key)!.push(entry);
  });

  // Read CSV
  const csv = fs.readFileSync('C:/Users/ferna/Downloads/Dashboard_Commerciale_Formazione (4) - Dati (3).csv', 'utf-8');
  const lines = csv.split('\n').slice(1);

  // Parse January 2026 leads from CSV
  const csvLeads: CSVLead[] = [];
  lines.forEach(line => {
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
        ricavi: parts[12]?.trim() || '0'
      });
    }
  });

  console.log(`CSV leads in January 2026: ${csvLeads.length}\n`);

  // Find leads that exist in BOTH DB and CSV, then compare for changes
  const changes: {
    name: string;
    field: string;
    dbValue: string;
    csvValue: string;
  }[] = [];

  const matchedLeads: { csv: CSVLead; db: DBLead }[] = [];
  const csvOnlyLeads: CSVLead[] = [];
  const dbOnlyLeads: DBLead[] = [];

  // Track which DB leads were matched
  const matchedDbIds = new Set<string>();

  csvLeads.forEach(csvLead => {
    const key = normalizeString(csvLead.name);
    const dbMatches = dbLeadMap.get(key);
    
    if (dbMatches && dbMatches.length > 0) {
      // Take the first match (or could be smarter with course matching)
      const dbLead = dbMatches[0];
      matchedDbIds.add(dbLead.id);
      matchedLeads.push({ csv: csvLead, db: dbLead });
      
      // Check for commercial changes
      const csvCommercial = normalizeString(csvLead.commercial);
      const dbCommercial = normalizeString(dbLead.commercial?.split(' ')[0]); // First name only
      if (csvCommercial && dbCommercial && csvCommercial !== dbCommercial) {
        changes.push({
          name: csvLead.name,
          field: 'Commercial',
          dbValue: dbLead.commercial || 'null',
          csvValue: csvLead.commercial
        });
      }

      // Check for course changes  
      const csvCourse = normalizeString(csvLead.course);
      const dbCourse = normalizeString(dbLead.course);
      if (csvCourse && dbCourse && csvCourse !== dbCourse) {
        // Allow for the "in" variation
        const csvNormalized = csvCourse.replace('masterclass game design', 'masterclass in game design');
        if (csvNormalized !== dbCourse) {
          changes.push({
            name: csvLead.name,
            field: 'Course',
            dbValue: dbLead.course || 'null',
            csvValue: csvLead.course
          });
        }
      }

      // Check for enrollment changes
      const csvEnrolled = csvLead.iscrizioni.toUpperCase() === 'SI';
      if (csvEnrolled !== dbLead.enrolled) {
        changes.push({
          name: csvLead.name,
          field: 'Enrolled',
          dbValue: String(dbLead.enrolled),
          csvValue: String(csvEnrolled)
        });
      }

      // Check for status changes (contacted)
      const csvContacted = csvLead.contattati.toUpperCase() === 'SI';
      const dbContacted = dbLead.status !== 'NUOVO';
      if (csvContacted && !dbContacted) {
        changes.push({
          name: csvLead.name,
          field: 'Status (needs update to CONTATTATO)',
          dbValue: dbLead.status,
          csvValue: 'Should be CONTATTATO'
        });
      }

      // Check for revenue changes (only if CSV has revenue and DB doesn't match)
      const csvRevenue = parseFloat(csvLead.ricavi) || 0;
      const dbRevenue = dbLead.revenue || 0;
      if (csvRevenue > 0 && csvRevenue !== dbRevenue) {
        changes.push({
          name: csvLead.name,
          field: 'Revenue',
          dbValue: String(dbRevenue),
          csvValue: String(csvRevenue)
        });
      }
    } else {
      csvOnlyLeads.push(csvLead);
    }
  });

  // Find DB-only leads (in DB but not in CSV)
  dbLeads.forEach(l => {
    if (!matchedDbIds.has(l.id)) {
      dbOnlyLeads.push({
        id: l.id,
        name: l.name,
        commercial: l.assignedTo?.name || null,
        course: l.course?.name || null,
        status: l.status,
        enrolled: l.enrolled,
        revenue: l.revenue ? Number(l.revenue) : null
      });
    }
  });

  // Summary
  console.log('=== SUMMARY ===\n');
  console.log(`Matched leads (in both DB and CSV): ${matchedLeads.length}`);
  console.log(`CSV-only leads (missing from DB): ${csvOnlyLeads.length}`);
  console.log(`DB-only leads (not in CSV): ${dbOnlyLeads.length}`);
  console.log(`Total changes detected: ${changes.length}`);

  // Show changes by field
  if (changes.length > 0) {
    console.log('\n=== CHANGES DETECTED ===\n');
    
    const changesByField: Record<string, typeof changes> = {};
    changes.forEach(c => {
      if (!changesByField[c.field]) changesByField[c.field] = [];
      changesByField[c.field].push(c);
    });

    for (const [field, fieldChanges] of Object.entries(changesByField)) {
      console.log(`\n${field} changes (${fieldChanges.length}):`);
      fieldChanges.slice(0, 10).forEach(c => {
        console.log(`  ${c.name}: "${c.dbValue}" → "${c.csvValue}"`);
      });
      if (fieldChanges.length > 10) {
        console.log(`  ... and ${fieldChanges.length - 10} more`);
      }
    }
  }

  // Show DB-only leads (added directly in system?)
  if (dbOnlyLeads.length > 0) {
    console.log('\n=== DB-ONLY LEADS (not in CSV) ===');
    console.log('These were likely added directly in the system:\n');
    dbOnlyLeads.slice(0, 20).forEach(l => {
      console.log(`  ${l.name} | ${l.commercial || 'unassigned'} | ${l.course || 'no course'} | ${l.status}`);
    });
    if (dbOnlyLeads.length > 20) {
      console.log(`  ... and ${dbOnlyLeads.length - 20} more`);
    }
  }

  // Show CSV-only leads (need to be imported)
  if (csvOnlyLeads.length > 0) {
    console.log('\n=== CSV-ONLY LEADS (need import) ===');
    console.log(`Total: ${csvOnlyLeads.length}\n`);
    
    // Group by course
    const byCourse: Record<string, CSVLead[]> = {};
    csvOnlyLeads.forEach(l => {
      const course = l.course || '[EMPTY]';
      if (!byCourse[course]) byCourse[course] = [];
      byCourse[course].push(l);
    });
    
    console.log('By course:');
    Object.entries(byCourse).sort((a, b) => b[1].length - a[1].length).forEach(([course, leads]) => {
      console.log(`  ${leads.length}x ${course}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
