const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    select: { 
      id: true, 
      name: true, 
      status: true,
      platform: true,
      _count: { select: { leads: true } }
    }
  });
  
  console.log('=== CAMPAIGNS ===\n');
  campaigns.forEach(c => {
    console.log(`${c.name}`);
    console.log(`   ID: ${c.id}`);
    console.log(`   Platform: ${c.platform}`);
    console.log(`   Status: ${c.status}`);
    console.log(`   Leads: ${c._count.leads}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkCampaigns();
