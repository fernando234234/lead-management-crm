import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

async function run() {
  const adminId = 'cmkmicxot00003ey4qsyzca18';
  
  // Get all leads assigned to Admin
  const adminLeads = await prisma.lead.findMany({
    where: { assignedToId: adminId },
    include: { course: true }
  });
  
  console.log(`Total leads assigned to Admin: ${adminLeads.length}`);
  console.log(`Enrolled: ${adminLeads.filter(l => l.status === 'ISCRITTO').length}\n`);
  
  // Load CSV to find original commerciale
  const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_VALID_485.csv', 'utf-8'), { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true,
    relax_column_count: true
  });
  
  // Build CSV lookup by name+course
  const csvLookup = new Map<string, string>();
  for (const row of data) {
    const key = `${normalize(row['Studente'])}|${normalize(row['Corso'])}`;
    csvLookup.set(key, row['Commerciale']);
  }
  
  // Check each admin lead against CSV
  console.log('=== ADMIN LEADS - WHO SHOULD OWN THEM ===\n');
  
  const byCommerciale = new Map<string, { name: string; course: string; status: string }[]>();
  const notInCSV: { name: string; course: string; status: string }[] = [];
  
  for (const lead of adminLeads) {
    const key = `${normalize(lead.name)}|${normalize(lead.course?.name || '')}`;
    const commerciale = csvLookup.get(key);
    
    if (commerciale) {
      if (!byCommerciale.has(commerciale)) {
        byCommerciale.set(commerciale, []);
      }
      byCommerciale.get(commerciale)!.push({
        name: lead.name,
        course: lead.course?.name || '',
        status: lead.status
      });
    } else {
      notInCSV.push({
        name: lead.name,
        course: lead.course?.name || '',
        status: lead.status
      });
    }
  }
  
  // Print by commerciale
  for (const [comm, leads] of byCommerciale) {
    const enrolled = leads.filter(l => l.status === 'ISCRITTO').length;
    console.log(`${comm}: ${leads.length} leads (${enrolled} enrolled)`);
    leads.forEach(l => console.log(`  - ${l.name} | ${l.course} | ${l.status}`));
    console.log('');
  }
  
  console.log(`\n=== NOT IN CONTRACTS CSV: ${notInCSV.length} ===`);
  const notInCSVEnrolled = notInCSV.filter(l => l.status === 'ISCRITTO');
  console.log(`(${notInCSVEnrolled.length} enrolled)\n`);
  notInCSV.forEach(l => console.log(`  ${l.name} | ${l.course} | ${l.status}`));
  
  await prisma.$disconnect();
}

run().catch(console.error);
