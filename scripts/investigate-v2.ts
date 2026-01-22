import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check enrolled breakdown
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    select: { 
      name: true, 
      notes: true,
      createdAt: true,
      course: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Total enrolled: ${enrolled.length}\n`);
  
  // Split by notes
  const fromContracts = enrolled.filter(l => l.notes?.includes('Imported from contracts'));
  const otherEnrolled = enrolled.filter(l => !l.notes?.includes('Imported from contracts'));
  
  console.log(`Imported from contracts (recent): ${fromContracts.length}`);
  console.log(`Other enrolled (from original CSV): ${otherEnrolled.length}`);
  
  console.log(`\n=== SAMPLE OF "FROM CONTRACTS" (most recent 10) ===`);
  fromContracts.slice(0, 10).forEach(l => {
    console.log(`  ${l.name} - ${l.course?.name} - ${l.createdAt.toISOString().split('T')[0]}`);
  });
  
  console.log(`\n=== SAMPLE OF "OTHER ENROLLED" (most recent 10) ===`);
  otherEnrolled.slice(0, 10).forEach(l => {
    console.log(`  ${l.name} - ${l.course?.name} - ${l.createdAt.toISOString().split('T')[0]}`);
  });
  
  // The other enrolled came from the original leads import
  // They were already marked ISCRITTO in the original CSV
  console.log(`\n=== BREAKDOWN ===`);
  console.log(`577 total enrolled = ${fromContracts.length} (from contracts import) + ${otherEnrolled.length} (from original leads CSV)`);
  
  // The question is: should those 441 from original CSV be enrolled?
  // They were marked ISCRITTO in the leads CSV but may not all have contracts
  
  await prisma.$disconnect();
}

main().catch(console.error);
