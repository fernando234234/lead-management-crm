import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const byName = new Map<string, typeof enrolled>();
  
  for (const e of enrolled) {
    const n = normalize(e.name);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n)!.push(e);
  }
  
  console.log('Total enrolled:', enrolled.length);
  console.log('Unique names:', byName.size);
  
  const dups = [...byName.entries()].filter(([_, list]) => list.length > 1);
  console.log('Names with multiple enrollments:', dups.length);
  
  if (dups.length > 0) {
    console.log('\nDuplicates (showing first 15):');
    for (const [name, list] of dups.slice(0, 15)) {
      console.log(`\n  ${name}:`);
      list.forEach(l => console.log(`    - ${l.course?.name} | €${l.revenue}`));
    }
  }
  
  await prisma.$disconnect();
}
check();
