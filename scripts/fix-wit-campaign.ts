import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== FIXING [Wit] CAMPAIGN ===\n');

  const witCampaignId = 'cmkr3wd5g00076jdesr6n30nz';

  // 1. Delete "Pippo" test lead
  console.log('1. Deleting test lead "Pippo"...');
  const pippo = await prisma.lead.findFirst({
    where: { name: 'Pippo', campaignId: witCampaignId }
  });
  
  if (pippo) {
    await prisma.lead.delete({ where: { id: pippo.id } });
    console.log('   ✓ Deleted Pippo (ID: ' + pippo.id + ')');
  } else {
    console.log('   - Pippo not found');
  }

  // 2. Find the proper campaigns for each remaining lead
  console.log('\n2. Reassigning leads to proper campaigns...\n');

  const remainingLeads = await prisma.lead.findMany({
    where: { campaignId: witCampaignId },
    include: { course: true }
  });

  for (const lead of remainingLeads) {
    const courseName = lead.course?.name;
    
    // Find campaign matching the course name
    const properCampaign = await prisma.campaign.findFirst({
      where: { 
        name: { contains: courseName, mode: 'insensitive' },
        id: { not: witCampaignId }
      }
    });

    if (properCampaign) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { campaignId: properCampaign.id }
      });
      console.log(`   ✓ ${lead.name}`);
      console.log(`     Course: ${courseName}`);
      console.log(`     Moved to: "${properCampaign.name}"`);
    } else {
      console.log(`   ⚠️ ${lead.name}`);
      console.log(`     Course: ${courseName}`);
      console.log(`     No matching campaign found - leaving unassigned`);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { campaignId: null }
      });
    }
    console.log('');
  }

  // 3. Delete the [Wit] campaign
  console.log('3. Deleting [Wit] campaign...');
  
  // Check if any leads still attached
  const stillAttached = await prisma.lead.count({ where: { campaignId: witCampaignId } });
  
  if (stillAttached === 0) {
    await prisma.campaign.delete({ where: { id: witCampaignId } });
    console.log('   ✓ Campaign deleted');
  } else {
    console.log('   ⚠️ Cannot delete - still has ' + stillAttached + ' leads attached');
  }

  // 4. Verify
  console.log('\n=== VERIFICATION ===');
  const campaignCount = await prisma.campaign.count();
  console.log('Total campaigns now: ' + campaignCount);

  await prisma.$disconnect();
}

fix();
