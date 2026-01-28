import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const campaignIds = [
    'cmkydotd9002c65thho7982cm',
    'cmkydotob002h65thq1bobne8',
    'cmkydotuf002l65tha4yp6465',
    'cmkydou0j002p65thgot89hiw',
    'cmkydovan003j65th0kpbsxse'
  ];

  console.log('=== CHECKING ORPHANED IMPORT CAMPAIGNS ===\n');

  for (const id of campaignIds) {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { 
        leads: { select: { id: true, name: true, status: true } },
        course: { select: { name: true } },
        spendRecords: true
      }
    });
    
    if (!campaign) {
      console.log(`Campaign ${id}: NOT FOUND`);
      continue;
    }

    console.log(`${campaign.name}`);
    console.log(`  ID: ${id}`);
    console.log(`  Course: ${campaign.course?.name}`);
    console.log(`  Leads: ${campaign.leads.length}`);
    console.log(`  Spend Records: ${campaign.spendRecords.length}`);
    
    if (campaign.leads.length > 0) {
      console.log('  Lead details:');
      campaign.leads.forEach(l => console.log(`    - ${l.name} (${l.status})`));
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

check();
