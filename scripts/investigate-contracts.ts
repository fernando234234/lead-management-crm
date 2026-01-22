import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(p => p.length > 0)
    .sort()
    .join(' ');
}

async function main() {
  // Parse the contracts CSV
  const csvContent = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Contratti_CLEANED.csv', 'utf-8');
  const lines = csvContent.split('\n');
  
  console.log(`Total lines in CSV (including header): ${lines.length}`);
  
  // Count all rows and unique students
  const allRows: Array<{ name: string; course: string; commercial: string; date: string }> = [];
  const uniqueNames = new Set<string>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    
    if (parts.length >= 9 && parts[0].trim()) {
      const studentName = parts[0].trim();
      const course = parts[1].trim();
      const commercial = parts[7].trim();
      const date = parts[8].trim();
      
      if (studentName) {
        allRows.push({ name: studentName, course, commercial, date });
        uniqueNames.add(normalizeName(studentName));
      }
    }
  }
  
  console.log(`Parsed rows: ${allRows.length}`);
  console.log(`Unique student names: ${uniqueNames.size}`);
  
  // Get DB enrolled count
  const dbEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const dbTotal = await prisma.lead.count();
  
  console.log(`\nDB total leads: ${dbTotal}`);
  console.log(`DB enrolled (ISCRITTO): ${dbEnrolled}`);
  
  // The issue: we have 577 enrolled but contracts only has 285 unique names
  // Let's see where the extra enrolled came from
  
  // Check how many enrolled came from LEGACY_IMPORT vs our recent import
  const enrolledBySource = await prisma.lead.groupBy({
    by: ['source'],
    where: { status: 'ISCRITTO' },
    _count: true
  });
  
  console.log(`\n=== ENROLLED BY SOURCE ===`);
  enrolledBySource.forEach(s => {
    console.log(`  ${s.source}: ${s._count}`);
  });
  
  // Check how many have "Imported from contracts" in notes
  const importedFromContracts = await prisma.lead.count({
    where: {
      status: 'ISCRITTO',
      notes: { contains: 'Imported from contracts' }
    }
  });
  
  console.log(`\nEnrolled with "Imported from contracts" note: ${importedFromContracts}`);
  
  // So the original LEGACY_IMPORT had some already marked as enrolled
  // Let's see if they should be enrolled based on contracts
  
  const legacyEnrolled = await prisma.lead.findMany({
    where: {
      status: 'ISCRITTO',
      source: 'LEGACY_IMPORT',
      notes: { not: { contains: 'Imported from contracts' } }
    },
    select: { name: true, course: { select: { name: true } } }
  });
  
  console.log(`\nLegacy enrolled (not from our contracts import): ${legacyEnrolled.length}`);
  
  // How many of these legacy enrolled are in contracts?
  let legacyInContracts = 0;
  let legacyNotInContracts = 0;
  
  for (const lead of legacyEnrolled) {
    if (uniqueNames.has(normalizeName(lead.name))) {
      legacyInContracts++;
    } else {
      legacyNotInContracts++;
    }
  }
  
  console.log(`  - Found in contracts: ${legacyInContracts}`);
  console.log(`  - NOT in contracts: ${legacyNotInContracts}`);
  
  // These 269 NOT in contracts - should they be un-enrolled?
  console.log(`\n=== RECOMMENDATION ===`);
  console.log(`The original leads CSV had ${legacyEnrolled.length} marked as ISCRITTO`);
  console.log(`But only ${legacyInContracts} of them appear in the contracts file`);
  console.log(`${legacyNotInContracts} are marked enrolled but have NO contract`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
