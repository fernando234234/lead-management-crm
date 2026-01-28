import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deleteOrphaned() {
  const campaignIds = [
    'cmkydotd9002c65thho7982cm',
    'cmkydotob002h65thq1bobne8',
    'cmkydotuf002l65tha4yp6465',
    'cmkydou0j002p65thgot89hiw',
    'cmkydovan003j65th0kpbsxse'
  ];

  console.log('Deleting 5 orphaned import campaigns...\n');

  const result = await prisma.campaign.deleteMany({
    where: { id: { in: campaignIds } }
  });

  console.log(`Deleted ${result.count} campaigns.`);
  
  const remaining = await prisma.campaign.count();
  console.log(`Campaigns remaining: ${remaining}`);
  
  await prisma.$disconnect();
}

deleteOrphaned();
