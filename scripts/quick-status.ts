import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stats = await prisma.lead.groupBy({
    by: ['status'],
    _count: true
  });
  
  console.log('Status distribution:');
  stats.forEach(x => console.log(`  ${x.status}: ${x._count}`));
  
  const total = await prisma.lead.count();
  console.log(`\nTotal leads: ${total}`);
  
  await prisma.$disconnect();
}

main();
