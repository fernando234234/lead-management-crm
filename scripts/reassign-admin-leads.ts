import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

async function run() {
  const adminId = 'cmkmicxot00003ey4qsyzca18';
  
  // Get all commercials
  const users = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' }
  });
  
  // Build user lookup by name variations
  const userMap = new Map<string, string>();
  for (const u of users) {
    userMap.set(normalize(u.name), u.id);
    // Also map by first name
    const firstName = u.name.split(' ')[0].toLowerCase();
    if (!userMap.has(firstName)) {
      userMap.set(firstName, u.id);
    }
  }
  
  console.log('Available commercials:');
  users.forEach(u => console.log(`  ${u.name} -> ${u.id}`));
  console.log('');
  
  // Load CSV to find original commerciale
  const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_VALID_485.csv', 'utf-8'), { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true,
    relax_column_count: true
  });
  
  // Build CSV lookup by name+course -> commerciale
  const csvLookup = new Map<string, string>();
  for (const row of data) {
    const key = `${normalize(row['Studente'])}|${normalize(row['Corso'])}`;
    csvLookup.set(key, row['Commerciale']);
  }
  
  // Get all leads assigned to Admin
  const adminLeads = await prisma.lead.findMany({
    where: { assignedToId: adminId },
    include: { course: true }
  });
  
  console.log(`Total leads assigned to Admin: ${adminLeads.length}\n`);
  
  // Reassign each lead
  let reassigned = 0;
  let notFound = 0;
  let notInCSV = 0;
  
  for (const lead of adminLeads) {
    const key = `${normalize(lead.name)}|${normalize(lead.course?.name || '')}`;
    const commercialeName = csvLookup.get(key);
    
    if (!commercialeName) {
      notInCSV++;
      continue;
    }
    
    // Find user ID for this commerciale
    const normComm = normalize(commercialeName);
    let userId = userMap.get(normComm);
    
    // Try first name only
    if (!userId) {
      const firstName = commercialeName.split(' ')[0].toLowerCase();
      userId = userMap.get(firstName);
    }
    
    if (!userId) {
      console.log(`  User not found for: ${commercialeName} (lead: ${lead.name})`);
      notFound++;
      continue;
    }
    
    // Update lead
    await prisma.lead.update({
      where: { id: lead.id },
      data: { assignedToId: userId }
    });
    reassigned++;
  }
  
  console.log(`\n=== RESULTS ===`);
  console.log(`Reassigned: ${reassigned}`);
  console.log(`Not in CSV (kept with Admin): ${notInCSV}`);
  console.log(`Commerciale not found: ${notFound}`);
  
  // Verify
  const remainingAdmin = await prisma.lead.count({ where: { assignedToId: adminId } });
  console.log(`\nLeads still with Admin: ${remainingAdmin}`);
  
  await prisma.$disconnect();
}

run().catch(console.error);
