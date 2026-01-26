const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== VERIFICATION ===\n');

  // Check a few updated leads
  const updatedNames = [
    'Stella Bertulli', 
    'Flaminia Balzani', 
    'Flavio Tarabù',
    'Jonathan Sposato'
  ];

  console.log('--- Sample Lead Verification ---\n');
  for (const name of updatedNames) {
    const lead = await prisma.lead.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } },
      select: {
        name: true,
        assignedTo: { select: { name: true } },
        course: { select: { name: true } },
        campaign: { select: { name: true } },
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (lead) {
      console.log(`${lead.name}`);
      console.log(`   Commercial: ${lead.assignedTo?.name || 'UNASSIGNED'}`);
      console.log(`   Course: ${lead.course?.name || 'N/A'}`);
      console.log(`   Campaign: ${lead.campaign?.name || 'NONE'}`);
      console.log(`   Status: ${lead.status}`);
      console.log('');
    }
  }

  // Check campaign lead counts for main courses in the import
  console.log('--- META Campaign Lead Counts ---\n');
  const campaignNames = [
    'Masterclass Graphic Web Design - META',
    'Masterclass Ai - META',
    'Masterclass Architectural Design - META',
    'Narrative Design - META',
    'Illustrazione Digitale - META',
    'Revit - META'
  ];

  for (const name of campaignNames) {
    const campaign = await prisma.campaign.findFirst({
      where: { name },
      select: { 
        name: true,
        _count: { select: { leads: true } }
      }
    });
    if (campaign) {
      console.log(`${campaign.name}: ${campaign._count.leads} leads`);
    }
  }

  // Count leads by commercial for today
  console.log('\n--- Leads Updated/Created Today by Commercial ---\n');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const recentLeads = await prisma.lead.groupBy({
    by: ['assignedToId'],
    where: {
      updatedAt: { gte: today }
    },
    _count: true
  });

  for (const group of recentLeads) {
    if (group.assignedToId) {
      const user = await prisma.user.findUnique({
        where: { id: group.assignedToId },
        select: { name: true }
      });
      console.log(`${user?.name || 'Unknown'}: ${group._count} leads updated today`);
    } else {
      console.log(`Unassigned: ${group._count} leads updated today`);
    }
  }

  await prisma.$disconnect();
}

verify();
