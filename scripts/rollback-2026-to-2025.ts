import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cutoffDate = new Date('2026-01-01T00:00:00.000Z');
  
  console.log('=== Finding records with dates after January 2026 ===\n');

  // Check Campaign dates
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { startDate: { gte: cutoffDate } },
        { endDate: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
      ]
    },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true, updatedAt: true }
  });
  console.log(`Campaigns with 2026+ dates: ${campaigns.length}`);
  if (campaigns.length > 0) {
    campaigns.forEach(c => console.log(`  - ${c.name}: start=${c.startDate?.toISOString()}, end=${c.endDate?.toISOString()}, created=${c.createdAt.toISOString()}`));
  }

  // Check CampaignSpend dates
  const spends = await prisma.campaignSpend.findMany({
    where: {
      OR: [
        { startDate: { gte: cutoffDate } },
        { endDate: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
      ]
    },
    select: { id: true, startDate: true, endDate: true, createdAt: true, amount: true }
  });
  console.log(`CampaignSpend with 2026+ dates: ${spends.length}`);
  if (spends.length > 0) {
    spends.slice(0, 5).forEach(s => console.log(`  - start=${s.startDate?.toISOString()}, end=${s.endDate?.toISOString()}, amount=${s.amount}`));
    if (spends.length > 5) console.log(`  ... and ${spends.length - 5} more`);
  }

  // Check Course dates
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { startDate: { gte: cutoffDate } },
        { endDate: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
      ]
    },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true }
  });
  console.log(`Courses with 2026+ dates: ${courses.length}`);
  if (courses.length > 0) {
    courses.forEach(c => console.log(`  - ${c.name}: start=${c.startDate?.toISOString()}, end=${c.endDate?.toISOString()}`));
  }

  // Check Lead dates
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { contactedAt: { gte: cutoffDate } },
        { enrolledAt: { gte: cutoffDate } },
        { appointmentDate: { gte: cutoffDate } },
        { firstAttemptAt: { gte: cutoffDate } },
        { lastAttemptAt: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
      ]
    },
    select: { id: true, name: true, contactedAt: true, enrolledAt: true, appointmentDate: true, createdAt: true }
  });
  console.log(`Leads with 2026+ dates: ${leads.length}`);
  if (leads.length > 0) {
    leads.slice(0, 5).forEach(l => console.log(`  - ${l.name}: created=${l.createdAt.toISOString()}, enrolled=${l.enrolledAt?.toISOString()}`));
    if (leads.length > 5) console.log(`  ... and ${leads.length - 5} more`);
  }

  // Check Task dates
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { dueDate: { gte: cutoffDate } },
        { completedAt: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
      ]
    },
    select: { id: true, title: true, dueDate: true, createdAt: true }
  });
  console.log(`Tasks with 2026+ dates: ${tasks.length}`);

  // Check LeadActivity dates
  const activities = await prisma.leadActivity.findMany({
    where: { createdAt: { gte: cutoffDate } },
    select: { id: true, type: true, createdAt: true }
  });
  console.log(`LeadActivities with 2026+ dates: ${activities.length}`);

  // Check Goal dates
  const goals = await prisma.goal.findMany({
    where: {
      OR: [
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
        { year: { gte: 2026 } },
      ]
    },
    select: { id: true, month: true, year: true, createdAt: true }
  });
  console.log(`Goals with 2026+ dates/year: ${goals.length}`);

  // Check Notification dates  
  const notifications = await prisma.notification.findMany({
    where: { createdAt: { gte: cutoffDate } },
    select: { id: true, title: true, createdAt: true }
  });
  console.log(`Notifications with 2026+ dates: ${notifications.length}`);

  // Check User dates
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
      ]
    },
    select: { id: true, name: true, createdAt: true }
  });
  console.log(`Users with 2026+ dates: ${users.length}`);

  // Check ProfitabilityRecord dates
  const profitRecords = await prisma.profitabilityRecord.findMany({
    where: {
      OR: [
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
        { year: { gte: 2026 } },
      ]
    },
    select: { id: true, month: true, year: true, createdAt: true }
  });
  console.log(`ProfitabilityRecords with 2026+ dates/year: ${profitRecords.length}`);

  // Check MasterCampaign dates
  const masterCampaigns = await prisma.masterCampaign.findMany({
    where: {
      OR: [
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
      ]
    },
    select: { id: true, name: true, createdAt: true }
  });
  console.log(`MasterCampaigns with 2026+ dates: ${masterCampaigns.length}`);

  console.log('\n=== Summary ===');
  const total = campaigns.length + spends.length + courses.length + leads.length + 
                tasks.length + activities.length + goals.length + notifications.length + 
                users.length + profitRecords.length + masterCampaigns.length;
  console.log(`Total records with 2026+ dates: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
