import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

async function run() {
  const leads = await prisma.lead.findMany({ 
    where: { status: 'ISCRITTO' }, 
    include: { course: true } 
  });
  
  const seen = new Map<string, string>();
  const dups: { name: string; course: string; id1: string; id2: string }[] = [];
  
  for (const l of leads) {
    const key = `${normalize(l.name)}|${normalize(l.course?.name || '')}`;
    if (seen.has(key)) {
      dups.push({ 
        name: l.name, 
        course: l.course?.name || '', 
        id1: seen.get(key)!, 
        id2: l.id 
      });
    } else {
      seen.set(key, l.id);
    }
  }
  
  console.log('Total enrolled leads:', leads.length);
  console.log('Unique name+course keys:', seen.size);
  console.log('Duplicates:', dups.length);
  
  if (dups.length > 0) {
    console.log('\nDuplicate entries:');
    dups.forEach(d => console.log(`  ${d.name} | ${d.course}`));
  }
  
  await prisma.$disconnect();
}

run().catch(console.error);
