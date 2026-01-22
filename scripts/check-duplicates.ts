import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  
  // Count by normalized name
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const byName = new Map<string, typeof enrolled>();
  
  for (const e of enrolled) {
    const n = normalize(e.name);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n)!.push(e);
  }
  
  // Find duplicates
  const dups = [...byName.entries()].filter(([_, list]) => list.length > 1);
  
  console.log('Total enrolled:', enrolled.length);
  console.log('Unique names:', byName.size);
  console.log('Duplicate names:', dups.length);
  
  if (dups.length > 0) {
    console.log('\n=== DUPLICATES ===');
    dups.forEach(([name, list]) => {
      console.log(`\n${name} (${list.length} entries):`);
      list.forEach(e => console.log(`  - ${e.name} | ${e.course?.name} | €${e.revenue}`));
    });
  }
  
  await prisma.$disconnect();
}
check();
