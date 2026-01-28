import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.campaign.count();
  console.log('Total campaigns now: ' + count);
  
  const importCampaigns = await prisma.campaign.findMany({
    where: { name: { startsWith: 'Import -' } },
    select: { id: true, name: true }
  });
  console.log('Import campaigns remaining: ' + importCampaigns.length);
  importCampaigns.forEach(c => console.log('  - ' + c.name));
  
  await prisma.$disconnect();
}
check();
