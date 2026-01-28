/**
 * Precise investigation of leads with empty courses - exact name matching only
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function normalizeString(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim();
}

async function main() {
  console.log('=== INVESTIGATING LEADS WITH EMPTY COURSES (Precise) ===\n');

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

  // Search for each name across ALL rows in CSV - EXACT match only
  for (const targetName of emptyCoursesNames) {
    const targetNorm = normalizeString(targetName);
    console.log(`\n=== ${targetName} ===`);
    
    const matches: string[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split(',');
      const name = normalizeString(parts[1]);
      
      // EXACT match only
      if (name === targetNorm) {
        const date = parts[0]?.trim();
        const commercial = parts[2]?.trim();
        const course = parts[3]?.trim() || '[EMPTY]';
        const contattati = parts[8]?.trim() || '';
        const iscrizioni = parts[10]?.trim() || '';
        const ricavi = parts[12]?.trim() || '0';
        
        matches.push(`  CSV Row ${idx + 2}: ${date} | ${commercial} | ${course} | Contattati: ${contattati} | Iscrizioni: ${iscrizioni} | Ricavi: ${ricavi}`);
      }
    });
    
    if (matches.length === 0) {
      console.log(`  [No exact matches in CSV]`);
    } else {
      matches.forEach(m => console.log(m));
    }
    
    // Also search in DB for any existing leads with this name
    const dbLeads = await prisma.lead.findMany({
      where: {
        name: {
          equals: targetName,
          mode: 'insensitive'
        }
      },
      include: {
        course: { select: { name: true } },
        assignedTo: { select: { name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    if (dbLeads.length > 0) {
      console.log(`  DB matches:`);
      dbLeads.forEach(l => {
        console.log(`    ${l.createdAt.toISOString().slice(0,10)} | ${l.assignedTo?.name || 'unassigned'} | ${l.course?.name || '[no course]'} | ${l.status} | enrolled: ${l.enrolled}`);
      });
    } else {
      console.log(`  [Not in DB]`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
