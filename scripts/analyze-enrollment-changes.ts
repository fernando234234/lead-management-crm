/**
 * Deep analysis of enrollment discrepancies between DB and CSV
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function normalizeString(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim();
}

async function main() {
  console.log('=== ENROLLMENT DISCREPANCY ANALYSIS ===\n');

  // Get existing January 2026 leads from DB
  const dbLeads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') }
    },
    include: {
      assignedTo: { select: { name: true } },
      course: { select: { name: true } }
    }
  });

  // Create a map of DB leads by normalized name
  const dbLeadMap = new Map<string, typeof dbLeads[0][]>();
  dbLeads.forEach(l => {
    const key = normalizeString(l.name);
    if (!dbLeadMap.has(key)) dbLeadMap.set(key, []);
    dbLeadMap.get(key)!.push(l);
  });

  // Read CSV
  const csv = fs.readFileSync('C:/Users/ferna/Downloads/Dashboard_Commerciale_Formazione (4) - Dati (3).csv', 'utf-8');
  const lines = csv.split('\n').slice(1);

  // Track enrollment discrepancies
  const dbEnrolledCsvNot: { name: string; course: string; commercial: string; status: string }[] = [];
  const csvEnrolledDbNot: { name: string; course: string; commercial: string; csvRicavi: string }[] = [];

  lines.forEach(line => {
    const parts = line.split(',');
    const date = parts[0]?.trim();
    const name = parts[1]?.trim();
    
    if (date && date.match(/\/01\/2026/) && name) {
      const csvEnrolled = (parts[10]?.trim().toUpperCase()) === 'SI';
      const csvCourse = parts[3]?.trim() || '';
      const csvCommercial = parts[2]?.trim() || '';
      const csvRicavi = parts[12]?.trim() || '0';
      
      const key = normalizeString(name);
      const dbMatches = dbLeadMap.get(key);
      
      if (dbMatches && dbMatches.length > 0) {
        const dbLead = dbMatches[0];
        
        if (dbLead.enrolled && !csvEnrolled) {
          dbEnrolledCsvNot.push({
            name,
            course: dbLead.course?.name || 'no course',
            commercial: dbLead.assignedTo?.name || 'unassigned',
            status: dbLead.status
          });
        } else if (!dbLead.enrolled && csvEnrolled) {
          csvEnrolledDbNot.push({
            name,
            course: csvCourse || 'no course',
            commercial: csvCommercial,
            csvRicavi
          });
        }
      }
    }
  });

  console.log('=== DB says ENROLLED, CSV says NOT enrolled ===');
  console.log(`Count: ${dbEnrolledCsvNot.length}\n`);
  console.log('These leads are marked as enrolled in the database but NOT in the CSV.');
  console.log('Possible reasons: CSV is outdated, or DB has incorrect data.\n');
  dbEnrolledCsvNot.forEach(l => {
    console.log(`  ${l.name} | ${l.course} | ${l.commercial} | Status: ${l.status}`);
  });

  console.log('\n\n=== CSV says ENROLLED, DB says NOT enrolled ===');
  console.log(`Count: ${csvEnrolledDbNot.length}\n`);
  console.log('These leads are marked as enrolled in CSV but NOT in the database.');
  console.log('These should probably be UPDATED in the database.\n');
  csvEnrolledDbNot.forEach(l => {
    console.log(`  ${l.name} | ${l.course} | ${l.commercial} | Ricavi: ${l.csvRicavi}`);
  });

  // Also check the enrolled leads that are CSV-only (155 missing)
  console.log('\n\n=== ENROLLED LEADS in CSV-only (need import) ===');
  const csvOnlyEnrolled: { name: string; course: string; commercial: string; ricavi: string }[] = [];
  
  lines.forEach(line => {
    const parts = line.split(',');
    const date = parts[0]?.trim();
    const name = parts[1]?.trim();
    
    if (date && date.match(/\/01\/2026/) && name) {
      const key = normalizeString(name);
      const dbMatches = dbLeadMap.get(key);
      
      if (!dbMatches || dbMatches.length === 0) {
        const csvEnrolled = (parts[10]?.trim().toUpperCase()) === 'SI';
        if (csvEnrolled) {
          csvOnlyEnrolled.push({
            name,
            course: parts[3]?.trim() || '[EMPTY]',
            commercial: parts[2]?.trim() || '',
            ricavi: parts[12]?.trim() || '0'
          });
        }
      }
    }
  });

  console.log(`Count: ${csvOnlyEnrolled.length}\n`);
  csvOnlyEnrolled.forEach(l => {
    console.log(`  ${l.name} | ${l.course} | ${l.commercial} | Ricavi: ${l.ricavi}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
