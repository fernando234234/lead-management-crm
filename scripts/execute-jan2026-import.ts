/**
 * Execute January 2026 Import & Updates
 * 
 * Actions:
 * 1. Import 147 new leads
 * 2. Update 48 commercial assignments
 * 3. Update 32 status changes (NUOVO → CONTATTATO)
 * 
 * Usage: npx tsx scripts/execute-jan2026-import.ts [--dry-run]
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

// Parse DD/MM/YYYY to Date
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.trim().split('/').map(Number);
  return new Date(year, month - 1, day);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('=== EXECUTE JANUARY 2026 IMPORT & UPDATES ===');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '🚀 LIVE EXECUTION'}\n`);

  // Get existing data from DB
  const [courses, users, dbLeads] = await Promise.all([
    prisma.course.findMany({ select: { id: true, name: true, price: true } }),
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
  const courseMap = new Map<string, { id: string; price: number }>();
  courses.forEach(c => courseMap.set(c.name.toLowerCase().trim(), { id: c.id, price: Number(c.price) || 0 }));
  
  // Add course mappings
  for (const [alias, real] of Object.entries(COURSE_MAPPING)) {
    const realCourse = courseMap.get(real.toLowerCase().trim());
    if (realCourse) courseMap.set(alias, realCourse);
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
  const commercialUpdates: { name: string; dbId: string; newUserId: string; oldCommercial: string; newCommercial: string }[] = [];
  const statusUpdates: { name: string; dbId: string }[] = [];

  for (const csvLead of csvLeads) {
    const key = normalizeString(csvLead.name);
    const dbLead = dbLeadMap.get(key);

    if (!dbLead) {
      // New lead - check if it should be imported
      if (!csvLead.course) continue; // Skip empty courses
      
      const courseKey = csvLead.course.toLowerCase().trim();
      const mappedCourse = COURSE_MAPPING[courseKey];
      const courseData = courseMap.get(mappedCourse?.toLowerCase().trim() || courseKey);
      
      if (courseData) {
        leadsToImport.push(csvLead);
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
            newUserId,
            oldCommercial: dbLead.assignedTo?.name || 'unassigned',
            newCommercial: csvLead.commercial
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
    }
  }

  // Execute imports
  console.log('=== IMPORTING NEW LEADS ===');
  console.log(`Total: ${leadsToImport.length}\n`);
  
  let importedCount = 0;
  let importErrors: string[] = [];
  
  for (const lead of leadsToImport) {
    const courseKey = lead.course.toLowerCase().trim();
    const mappedCourse = COURSE_MAPPING[courseKey];
    const courseData = courseMap.get(mappedCourse?.toLowerCase().trim() || courseKey);
    const assignedToId = userMap.get(normalizeString(lead.commercial)) || null;
    
    const isEnrolled = lead.iscrizioni.toUpperCase() === 'SI';
    const isContacted = lead.contattati.toUpperCase() === 'SI';
    const revenue = parseFloat(lead.ricavi) || (isEnrolled ? courseData?.price : null) || null;
    
    let status: 'NUOVO' | 'CONTATTATO' | 'ISCRITTO' = 'NUOVO';
    if (isEnrolled) status = 'ISCRITTO';
    else if (isContacted) status = 'CONTATTATO';

    if (dryRun) {
      console.log(`  [DRY] Would import: ${lead.name} | ${lead.course} | ${lead.commercial} | ${status}${isEnrolled ? ` | Revenue: €${revenue}` : ''}`);
      importedCount++;
    } else {
      try {
        await prisma.lead.create({
          data: {
            name: lead.name,
            courseId: courseData!.id,
            assignedToId,
            status,
            contacted: isContacted || isEnrolled,
            contactedAt: (isContacted || isEnrolled) ? parseDate(lead.date) : null,
            enrolled: isEnrolled,
            enrolledAt: isEnrolled ? parseDate(lead.date) : null,
            revenue,
            source: 'LEGACY_IMPORT',
            createdAt: parseDate(lead.date),
          }
        });
        importedCount++;
      } catch (error) {
        importErrors.push(`${lead.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  console.log(`\n✅ Imported: ${importedCount}`);
  if (importErrors.length > 0) {
    console.log(`❌ Errors: ${importErrors.length}`);
    importErrors.slice(0, 5).forEach(e => console.log(`   ${e}`));
  }

  // Execute commercial updates
  console.log('\n\n=== UPDATING COMMERCIAL ASSIGNMENTS ===');
  console.log(`Total: ${commercialUpdates.length}\n`);
  
  let commercialUpdatedCount = 0;
  
  for (const update of commercialUpdates) {
    if (dryRun) {
      console.log(`  [DRY] Would update: ${update.name} | ${update.oldCommercial} → ${update.newCommercial}`);
      commercialUpdatedCount++;
    } else {
      try {
        await prisma.lead.update({
          where: { id: update.dbId },
          data: { assignedToId: update.newUserId }
        });
        commercialUpdatedCount++;
      } catch (error) {
        console.log(`  ❌ Error updating ${update.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  }

  console.log(`\n✅ Updated: ${commercialUpdatedCount}`);

  // Execute status updates
  console.log('\n\n=== UPDATING STATUS (NUOVO → CONTATTATO) ===');
  console.log(`Total: ${statusUpdates.length}\n`);
  
  let statusUpdatedCount = 0;
  
  for (const update of statusUpdates) {
    if (dryRun) {
      console.log(`  [DRY] Would update: ${update.name} | NUOVO → CONTATTATO`);
      statusUpdatedCount++;
    } else {
      try {
        await prisma.lead.update({
          where: { id: update.dbId },
          data: { 
            status: 'CONTATTATO',
            contacted: true
          }
        });
        statusUpdatedCount++;
      } catch (error) {
        console.log(`  ❌ Error updating ${update.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  }

  console.log(`\n✅ Updated: ${statusUpdatedCount}`);

  // Final summary
  console.log('\n\n========================================');
  console.log('EXECUTION SUMMARY');
  console.log('========================================');
  console.log(`\nNew leads imported: ${importedCount}`);
  console.log(`Commercial updates: ${commercialUpdatedCount}`);
  console.log(`Status updates: ${statusUpdatedCount}`);
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made');
    console.log('Run without --dry-run to execute');
  } else {
    // Verify final count
    const finalCount = await prisma.lead.count({
      where: {
        createdAt: { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') }
      }
    });
    console.log(`\n📊 January 2026 leads now: ${finalCount}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
