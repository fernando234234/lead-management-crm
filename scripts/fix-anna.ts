import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const leads = await prisma.lead.findMany({ 
    where: { 
      name: { contains: 'CECCHINATO', mode: 'insensitive' },
      status: 'ISCRITTO'
    }, 
    include: { course: true } 
  });
  
  console.log('Found', leads.length, 'enrolled leads for CECCHINATO:');
  leads.forEach(l => console.log('  ID:', l.id, '| Course:', l.course?.name, '| Created:', l.createdAt));
  
  // Delete the newer duplicate (keep the older one)
  if (leads.length > 1) {
    const sorted = leads.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const toDelete = sorted.slice(1); // Keep first, delete rest
    
    for (const dup of toDelete) {
      console.log('\nDeleting duplicate:', dup.id);
      await prisma.lead.delete({ where: { id: dup.id } });
    }
  }
  
  // Verify
  const finalCount = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  console.log('\nFinal enrolled count:', finalCount);
  
  await prisma.$disconnect();
}

run().catch(console.error);
