import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function investigate() {
  const campaign = await prisma.campaign.findFirst({
    where: { name: { contains: 'Wit' } },
    include: {
      course: true,
      createdBy: true,
      spendRecords: true,
      leads: {
        include: {
          course: true,
          assignedTo: true,
          createdBy: true
        }
      }
    }
  });

  if (!campaign) {
    console.log('Campaign not found');
    await prisma.$disconnect();
    return;
  }

  console.log('=== CAMPAIGN DETAILS ===');
  console.log('Name:', campaign.name);
  console.log('ID:', campaign.id);
  console.log('Platform:', campaign.platform);
  console.log('Status:', campaign.status);
  console.log('Created:', campaign.createdAt);
  console.log('Created By:', campaign.createdBy?.name);
  console.log('Assigned Course:', campaign.course?.name);
  console.log('Spend Records:', campaign.spendRecords.length);
  if (campaign.spendRecords.length > 0) {
    const total = campaign.spendRecords.reduce((sum, r) => sum + Number(r.amount), 0);
    console.log('Total Spend: €' + total);
  }
  
  console.log('\n=== LEADS (' + campaign.leads.length + ') ===');
  for (const lead of campaign.leads) {
    console.log('\n- ' + lead.name);
    console.log('  Email:', lead.email || '(none)');
    console.log('  Phone:', lead.phone || '(none)');
    console.log('  Lead Course:', lead.course?.name);
    console.log('  Status:', lead.status);
    console.log('  Enrolled:', lead.enrolled);
    console.log('  Source:', lead.source);
    console.log('  Created:', lead.createdAt.toISOString());
    console.log('  Created By:', lead.createdBy?.name || '(unknown)');
    console.log('  Assigned To:', lead.assignedTo?.name || '(unassigned)');
    console.log('  Notes:', lead.notes || '(none)');
  }

  await prisma.$disconnect();
}

investigate();
