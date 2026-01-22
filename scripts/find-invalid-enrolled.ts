import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findInvalidEnrolled() {
  // Load new cleaned CSV (source of truth for contracts)
  const csvContent = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log('=== FINDING INVALID ENROLLED (in DB but not in contracts) ===\n');
  console.log('Total students in contracts CSV:', records.length);
  
  // Build set of contracted student names (normalized)
  const normalize = (s: any) => (s || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
  
  const contractedNames = new Set<string>();
  for (const row of records) {
    const name = normalize(row['Studente']);
    if (name) contractedNames.add(name);
  }
  console.log('Unique contracted names:', contractedNames.size);
  
  // Get all enrolled from DB
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true, assignedTo: true }
  });
  console.log('Total enrolled in DB:', enrolled.length);
  
  // Find enrolled in DB but NOT in contracts
  const invalidEnrolled: typeof enrolled = [];
  
  for (const e of enrolled) {
    const name = normalize(e.name);
    if (!contractedNames.has(name)) {
      invalidEnrolled.push(e);
    }
  }
  
  console.log('\n--- Results ---');
  console.log('Valid enrolled (in contracts):', enrolled.length - invalidEnrolled.length);
  console.log('INVALID enrolled (NOT in contracts):', invalidEnrolled.length);
  
  if (invalidEnrolled.length > 0) {
    console.log('\n=== INVALID ENROLLED (should be un-enrolled) ===');
    invalidEnrolled.forEach((e, i) => {
      console.log(`${i+1}. ${e.name} | ${e.course?.name} | €${e.revenue} | ${e.assignedTo?.name || 'unassigned'}`);
    });
    
    // Calculate revenue impact
    const totalInvalidRevenue = invalidEnrolled.reduce((sum, e) => sum + Number(e.revenue || 0), 0);
    console.log(`\nTotal invalid revenue: €${totalInvalidRevenue}`);
  }
  
  await prisma.$disconnect();
}

findInvalidEnrolled().catch(console.error);
