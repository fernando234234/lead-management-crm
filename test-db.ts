import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing specific queries...');
  
  try {
    const activeCampaigns = await prisma.campaign.count({ where: { status: "ACTIVE" } });
    console.log(`Active campaigns: ${activeCampaigns}`);
  } catch (e) {
    console.error('Error on activeCampaigns:', e);
  }

  try {
    const spendRecords = await prisma.campaignSpend.aggregate({
      _sum: { amount: true },
    });
    console.log(`Total spend: ${spendRecords._sum.amount}`);
  } catch (e) {
    console.error('Error on spendRecords:', e);
  }

  try {
    const topCampaigns = await prisma.campaign.findMany({
      take: 5,
      include: {
        course: { select: { name: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { leads: { _count: "desc" } },
    });
    console.log(`Top campaigns: ${topCampaigns.length}`);
  } catch (e) {
    console.error('Error on topCampaigns:', e);
  }
  
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
