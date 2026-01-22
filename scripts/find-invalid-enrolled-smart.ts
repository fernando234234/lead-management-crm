import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Normalize name for comparison (remove accents, special chars)
function normalizeName(s: string): string {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[''`]/g, '') // Remove apostrophes
    .replace(/[^a-z0-9 ]/g, ''); // Remove special chars
}

// Check if two names are similar (fuzzy match)
function namesSimilar(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Check if first and last name match (in any order)
  const parts1 = n1.split(' ').filter(p => p.length > 1);
  const parts2 = n2.split(' ').filter(p => p.length > 1);
  
  if (parts1.length >= 2 && parts2.length >= 2) {
    // Check if first+last match
    const first1 = parts1[0];
    const last1 = parts1[parts1.length - 1];
    const first2 = parts2[0];
    const last2 = parts2[parts2.length - 1];
    
    // Same first and last
    if (first1 === first2 && last1 === last2) return true;
    // Swapped first and last
    if (first1 === last2 && last1 === first2) return true;
    
    // First name same, last name similar (starts with same letters)
    if (first1 === first2 && (last1.startsWith(last2.slice(0, 4)) || last2.startsWith(last1.slice(0, 4)))) return true;
  }
  
  return false;
}

async function findInvalidEnrolled() {
  // Load new cleaned CSV (source of truth for contracts)
  const csvContent = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log('=== FINDING INVALID ENROLLED (SMART MATCHING) ===\n');
  console.log('Total students in contracts CSV:', records.length);
  
  // Build list of contracted names
  const contractedNames: string[] = [];
  for (const row of records) {
    const name = row['Studente'];
    if (name) contractedNames.push(name);
  }
  console.log('Contract names:', contractedNames.length);
  
  // Get all enrolled from DB
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true, assignedTo: true }
  });
  console.log('Total enrolled in DB:', enrolled.length);
  
  // Find enrolled in DB but NOT in contracts (using smart matching)
  const validEnrolled: typeof enrolled = [];
  const invalidEnrolled: { lead: typeof enrolled[0], possibleMatch?: string }[] = [];
  
  for (const e of enrolled) {
    let matched = false;
    let possibleMatch: string | undefined;
    
    for (const contractName of contractedNames) {
      if (namesSimilar(e.name, contractName)) {
        matched = true;
        if (normalizeName(e.name) !== normalizeName(contractName)) {
          possibleMatch = contractName; // Note the difference
        }
        break;
      }
    }
    
    if (matched) {
      validEnrolled.push(e);
    } else {
      invalidEnrolled.push({ lead: e, possibleMatch });
    }
  }
  
  console.log('\n--- Results ---');
  console.log('Valid enrolled (matched in contracts):', validEnrolled.length);
  console.log('INVALID enrolled (NOT in contracts):', invalidEnrolled.length);
  
  if (invalidEnrolled.length > 0) {
    console.log('\n=== INVALID ENROLLED (to be un-enrolled) ===');
    invalidEnrolled.forEach((item, i) => {
      const e = item.lead;
      console.log(`${i+1}. ${e.name} | ${e.course?.name} | €${e.revenue} | ${e.assignedTo?.name || 'unassigned'}`);
    });
    
    // Calculate revenue impact
    const totalInvalidRevenue = invalidEnrolled.reduce((sum, item) => sum + Number(item.lead.revenue || 0), 0);
    console.log(`\nTotal invalid revenue to remove: €${totalInvalidRevenue}`);
    console.log(`\nIDs to update:`);
    console.log(invalidEnrolled.map(item => item.lead.id).join(','));
  }
  
  await prisma.$disconnect();
}

findInvalidEnrolled().catch(console.error);
