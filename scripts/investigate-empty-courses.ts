/**
 * Deep investigation of leads with empty courses in CSV
 * Search across ALL rows in CSV to find if these names appear elsewhere with courses
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function normalizeString(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim();
}

async function main() {
  console.log('=== INVESTIGATING LEADS WITH EMPTY COURSES ===\n');

  // The 8 names with empty courses in January 2026
  const emptyCoursesNames = [
    'raffaello di lorenzo',
    'Andrea Cennamo', 
    'Olivia Albanesi',
    'Riccardo Olgiati',
    'Fabiola De Toma',
    'Maira Pistritto',
    'Sara Ragonesi',
    'Debora Camporesi'
  ];

  // Read CSV
  const csv = fs.readFileSync('C:/Users/ferna/Downloads/Dashboard_Commerciale_Formazione (4) - Dati (3).csv', 'utf-8');
  const lines = csv.split('\n').slice(1);

  // Search for each name across ALL rows in CSV
  for (const targetName of emptyCoursesNames) {
    const targetNorm = normalizeString(targetName);
    console.log(`\n=== Searching for: ${targetName} ===`);
    
    let found = false;
    lines.forEach((line, idx) => {
      const parts = line.split(',');
      const name = normalizeString(parts[1]);
      
      // Fuzzy match - check if names are similar
      if (name === targetNorm || name.includes(targetNorm) || targetNorm.includes(name)) {
        found = true;
        const date = parts[0]?.trim();
        const commercial = parts[2]?.trim();
        const course = parts[3]?.trim() || '[EMPTY]';
        const contattati = parts[8]?.trim() || '';
        const iscrizioni = parts[10]?.trim() || '';
        const ricavi = parts[12]?.trim() || '0';
        
        console.log(`  Row ${idx + 2}: ${date} | ${parts[1]?.trim()} | ${commercial} | ${course} | Contattati: ${contattati} | Iscrizioni: ${iscrizioni} | Ricavi: ${ricavi}`);
      }
    });
    
    if (!found) {
      console.log(`  [No matches found in CSV]`);
    }
    
    // Also search in DB for any existing leads with this name
    const dbLeads = await prisma.lead.findMany({
      where: {
        name: {
          contains: targetName,
          mode: 'insensitive'
        }
      },
      include: {
        course: { select: { name: true } },
        assignedTo: { select: { name: true } }
      }
    });
    
    if (dbLeads.length > 0) {
      console.log(`  [Found in DB:]`);
      dbLeads.forEach(l => {
        console.log(`    ${l.createdAt.toISOString().slice(0,10)} | ${l.name} | ${l.assignedTo?.name || 'unassigned'} | ${l.course?.name || 'no course'} | ${l.status}`);
      });
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
