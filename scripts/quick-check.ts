import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.lead.count();
  const jan2026 = await prisma.lead.count({ 
    where: { 
      createdAt: { 
        gte: new Date('2026-01-01'), 
        lt: new Date('2026-02-01') 
      } 
    } 
  });
  const latest = await prisma.lead.findFirst({ 
    orderBy: { createdAt: 'desc' }, 
    select: { name: true, createdAt: true } 
  });
  
  console.log('=== Current Database State ===');
  console.log('Total leads:', total);
  console.log('January 2026 leads:', jan2026);
  console.log('Latest lead:', latest?.name, latest?.createdAt?.toISOString().slice(0,10));
  
  await prisma.$disconnect();
}

main();
