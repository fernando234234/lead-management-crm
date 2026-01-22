import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const names = ['triarico', 'mattelli', 'setayesh', 'ronza'];
  
  for (const name of names) {
    const leads = await prisma.lead.findMany({
      where: { 
        name: { contains: name, mode: 'insensitive' },
        status: 'ISCRITTO'
      },
      include: { course: true }
    });
    console.log(`\n${name}:`);
    for (const l of leads) {
      console.log(`  - ${l.name} | ${l.course.name}`);
    }
    if (leads.length === 0) {
      // Check any lead with this name
      const anyLeads = await prisma.lead.findMany({
        where: { name: { contains: name, mode: 'insensitive' } },
        include: { course: true }
      });
      console.log(`  (No ISCRITTO, but ${anyLeads.length} total leads with this name)`);
      for (const l of anyLeads) {
        console.log(`    - ${l.name} | ${l.course.name} | ${l.status}`);
      }
    }
  }
}
main().finally(() => prisma.$disconnect());
