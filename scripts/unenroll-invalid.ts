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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9 ]/g, '');
}

// Check if two names are similar (fuzzy match)
function namesSimilar(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  const parts1 = n1.split(' ').filter(p => p.length > 1);
  const parts2 = n2.split(' ').filter(p => p.length > 1);
  
  if (parts1.length >= 2 && parts2.length >= 2) {
    const first1 = parts1[0];
    const last1 = parts1[parts1.length - 1];
    const first2 = parts2[0];
    const last2 = parts2[parts2.length - 1];
    
    if (first1 === first2 && last1 === last2) return true;
    if (first1 === last2 && last1 === first2) return true;
    if (first1 === first2 && (last1.startsWith(last2.slice(0, 4)) || last2.startsWith(last1.slice(0, 4)))) return true;
  }
  
  return false;
}

async function unenrollInvalid() {
  // Load contracts CSV
  const csvContent = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log('=== UN-ENROLLING INVALID STUDENTS ===\n');
  
  // Build list of contracted names
  const contractedNames: string[] = records.map(r => r['Studente']).filter(Boolean);
  
  // Get all enrolled from DB
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true, assignedTo: true }
  });
  
  console.log('Total enrolled in DB:', enrolled.length);
  console.log('Total in contracts:', contractedNames.length);
  
  // Find invalid
  const invalidIds: string[] = [];
  const invalidLeads: typeof enrolled = [];
  
  for (const e of enrolled) {
    let matched = false;
    for (const contractName of contractedNames) {
      if (namesSimilar(e.name, contractName)) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      invalidIds.push(e.id);
      invalidLeads.push(e);
    }
  }
  
  console.log('Invalid to un-enroll:', invalidIds.length);
  
  // Un-enroll them
  const result = await prisma.lead.updateMany({
    where: { id: { in: invalidIds } },
    data: {
      status: 'CONTATTATO', // Set back to contacted
      enrolled: false,
      revenue: 0
    }
  });
  
  console.log(`\nUn-enrolled ${result.count} leads`);
  
  // Show final stats
  const finalEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const finalRevenue = await prisma.lead.aggregate({ _sum: { revenue: true } });
  
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Total enrolled: ${finalEnrolled}`);
  console.log(`Total revenue: €${finalRevenue._sum.revenue}`);
  
  await prisma.$disconnect();
}

unenrollInvalid().catch(console.error);
