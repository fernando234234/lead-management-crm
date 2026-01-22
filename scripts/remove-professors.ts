import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Removing professors from leads ===\n');
  
  // Find and delete Salvatore Sterlino
  const sterlino = await prisma.lead.deleteMany({
    where: {
      name: {
        contains: 'Sterlino',
        mode: 'insensitive'
      }
    }
  });
  console.log(`Deleted Salvatore Sterlino: ${sterlino.count} records`);
  
  // Find and delete Manuel Alvaro
  const alvaro = await prisma.lead.deleteMany({
    where: {
      name: {
        contains: 'Manuel Alvaro',
        mode: 'insensitive'
      }
    }
  });
  console.log(`Deleted Manuel Alvaro: ${alvaro.count} records`);
  
  // Also delete Benedetta user since she only had those 2
  const benedetta = await prisma.user.deleteMany({
    where: { username: 'benedetta.' }
  });
  console.log(`Deleted user benedetta.: ${benedetta.count}`);
  
  // Show new totals
  const totalLeads = await prisma.lead.count();
  const totalEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const totalRevenue = await prisma.lead.aggregate({
    where: { status: 'ISCRITTO' },
    _sum: { revenue: true }
  });
  
  console.log(`\n=== CURRENT TOTALS ===`);
  console.log(`Total leads: ${totalLeads}`);
  console.log(`Total enrolled: ${totalEnrolled}`);
  console.log(`Total revenue: €${totalRevenue._sum.revenue}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
