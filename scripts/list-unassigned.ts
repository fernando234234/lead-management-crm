import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) return;
  
  const unassigned = await prisma.lead.findMany({
    where: { assignedToId: adminUser.id },
    select: { name: true, createdAt: true },
    orderBy: { name: 'asc' }
  });
  
  console.log(`=== ${unassigned.length} LEADS STILL ASSIGNED TO ADMIN ===\n`);
  unassigned.forEach(l => {
    console.log(`"${l.name}"`);
  });
  
  await prisma.$disconnect();
}

main();
