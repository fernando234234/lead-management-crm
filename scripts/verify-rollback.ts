import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cutoffDate = new Date('2026-01-01T00:00:00.000Z');
  
  console.log('=== Verifying rollback (excluding auto-updatedAt fields) ===\n');

  // Check Campaign dates (excluding updatedAt)
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { startDate: { gte: cutoffDate } },
        { endDate: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
      ]
    },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true }
  });
  console.log(`Campaigns with 2026+ dates: ${campaigns.length}`);

  // Check CampaignSpend dates
  const spends = await prisma.campaignSpend.findMany({
    where: {
      OR: [
        { startDate: { gte: cutoffDate } },
        { endDate: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
      ]
    }
  });
  console.log(`CampaignSpend with 2026+ dates: ${spends.length}`);

  // Check Course dates (excluding updatedAt)
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { startDate: { gte: cutoffDate } },
        { endDate: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
      ]
    }
  });
  console.log(`Courses with 2026+ dates: ${courses.length}`);

  // Check Lead dates (excluding updatedAt)
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { contactedAt: { gte: cutoffDate } },
        { enrolledAt: { gte: cutoffDate } },
        { appointmentDate: { gte: cutoffDate } },
        { firstAttemptAt: { gte: cutoffDate } },
        { lastAttemptAt: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
      ]
    },
    select: { id: true, name: true, createdAt: true, enrolledAt: true }
  });
  console.log(`Leads with 2026+ dates: ${leads.length}`);
  if (leads.length > 0) {
    leads.forEach(l => console.log(`  - ${l.name}: created=${l.createdAt.toISOString()}, enrolled=${l.enrolledAt?.toISOString()}`));
  }

  // Check other tables
  const activities = await prisma.leadActivity.findMany({ where: { createdAt: { gte: cutoffDate } } });
  console.log(`LeadActivities with 2026+ dates: ${activities.length}`);

  const notifications = await prisma.notification.findMany({ where: { createdAt: { gte: cutoffDate } } });
  console.log(`Notifications with 2026+ dates: ${notifications.length}`);

  const goals = await prisma.goal.findMany({ where: { year: { gte: 2026 } } });
  console.log(`Goals with year >= 2026: ${goals.length}`);

  const users = await prisma.user.findMany({ where: { createdAt: { gte: cutoffDate } } });
  console.log(`Users with 2026+ createdAt: ${users.length}`);

  const profitRecords = await prisma.profitabilityRecord.findMany({ where: { year: { gte: 2026 } } });
  console.log(`ProfitabilityRecords with year >= 2026: ${profitRecords.length}`);

  const masterCampaigns = await prisma.masterCampaign.findMany({ where: { createdAt: { gte: cutoffDate } } });
  console.log(`MasterCampaigns with 2026+ createdAt: ${masterCampaigns.length}`);

  console.log('\n=== Summary ===');
  const total = campaigns.length + spends.length + courses.length + leads.length + 
                activities.length + notifications.length + goals.length + users.length + 
                profitRecords.length + masterCampaigns.length;
  console.log(`Total records with business dates in 2026+: ${total}`);
  
  if (total === 0) {
    console.log('\n✓ All dates successfully rolled back to 2025!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
