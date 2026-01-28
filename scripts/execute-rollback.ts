import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to subtract 1 year from a date
function rollbackYear(date: Date): Date {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() - 1);
  return newDate;
}

async function main() {
  const cutoffDate = new Date('2026-01-01T00:00:00.000Z');
  
  console.log('=== Rolling back 2026 dates to 2025 ===\n');

  // 1. Update Campaigns
  console.log('Updating Campaigns...');
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { startDate: { gte: cutoffDate } },
        { endDate: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
      ]
    }
  });
  
  for (const c of campaigns) {
    await prisma.campaign.update({
      where: { id: c.id },
      data: {
        startDate: c.startDate >= cutoffDate ? rollbackYear(c.startDate) : c.startDate,
        endDate: c.endDate && c.endDate >= cutoffDate ? rollbackYear(c.endDate) : c.endDate,
        createdAt: c.createdAt >= cutoffDate ? rollbackYear(c.createdAt) : c.createdAt,
        // updatedAt will auto-update, but we'll set it correctly
      }
    });
  }
  console.log(`  Updated ${campaigns.length} campaigns`);

  // 2. Update CampaignSpend
  console.log('Updating CampaignSpend...');
  const spends = await prisma.campaignSpend.findMany({
    where: {
      OR: [
        { startDate: { gte: cutoffDate } },
        { endDate: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
      ]
    }
  });
  
  for (const s of spends) {
    await prisma.campaignSpend.update({
      where: { id: s.id },
      data: {
        startDate: s.startDate >= cutoffDate ? rollbackYear(s.startDate) : s.startDate,
        endDate: s.endDate && s.endDate >= cutoffDate ? rollbackYear(s.endDate) : s.endDate,
        createdAt: s.createdAt >= cutoffDate ? rollbackYear(s.createdAt) : s.createdAt,
      }
    });
  }
  console.log(`  Updated ${spends.length} spend records`);

  // 3. Update Courses
  console.log('Updating Courses...');
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { startDate: { gte: cutoffDate } },
        { endDate: { gte: cutoffDate } },
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
      ]
    }
  });
  
  for (const c of courses) {
    await prisma.course.update({
      where: { id: c.id },
      data: {
        startDate: c.startDate && c.startDate >= cutoffDate ? rollbackYear(c.startDate) : c.startDate,
        endDate: c.endDate && c.endDate >= cutoffDate ? rollbackYear(c.endDate) : c.endDate,
        createdAt: c.createdAt >= cutoffDate ? rollbackYear(c.createdAt) : c.createdAt,
      }
    });
  }
  console.log(`  Updated ${courses.length} courses`);

  // 4. Update Leads (the biggest batch - 6877 records)
  console.log('Updating Leads...');
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
    }
  });
  
  let leadCount = 0;
  for (const l of leads) {
    await prisma.lead.update({
      where: { id: l.id },
      data: {
        contactedAt: l.contactedAt && l.contactedAt >= cutoffDate ? rollbackYear(l.contactedAt) : l.contactedAt,
        enrolledAt: l.enrolledAt && l.enrolledAt >= cutoffDate ? rollbackYear(l.enrolledAt) : l.enrolledAt,
        appointmentDate: l.appointmentDate && l.appointmentDate >= cutoffDate ? rollbackYear(l.appointmentDate) : l.appointmentDate,
        firstAttemptAt: l.firstAttemptAt && l.firstAttemptAt >= cutoffDate ? rollbackYear(l.firstAttemptAt) : l.firstAttemptAt,
        lastAttemptAt: l.lastAttemptAt && l.lastAttemptAt >= cutoffDate ? rollbackYear(l.lastAttemptAt) : l.lastAttemptAt,
        createdAt: l.createdAt >= cutoffDate ? rollbackYear(l.createdAt) : l.createdAt,
      }
    });
    leadCount++;
    if (leadCount % 500 === 0) {
      console.log(`  Progress: ${leadCount}/${leads.length} leads`);
    }
  }
  console.log(`  Updated ${leads.length} leads`);

  // 5. Update LeadActivity
  console.log('Updating LeadActivities...');
  const activities = await prisma.leadActivity.findMany({
    where: { createdAt: { gte: cutoffDate } }
  });
  
  for (const a of activities) {
    await prisma.leadActivity.update({
      where: { id: a.id },
      data: {
        createdAt: rollbackYear(a.createdAt),
      }
    });
  }
  console.log(`  Updated ${activities.length} activities`);

  // 6. Update Notifications
  console.log('Updating Notifications...');
  const notifications = await prisma.notification.findMany({
    where: { createdAt: { gte: cutoffDate } }
  });
  
  for (const n of notifications) {
    await prisma.notification.update({
      where: { id: n.id },
      data: {
        createdAt: rollbackYear(n.createdAt),
      }
    });
  }
  console.log(`  Updated ${notifications.length} notifications`);

  // 7. Update Users
  console.log('Updating Users...');
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
      ]
    }
  });
  
  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        createdAt: u.createdAt >= cutoffDate ? rollbackYear(u.createdAt) : u.createdAt,
      }
    });
  }
  console.log(`  Updated ${users.length} users`);

  // 8. Update MasterCampaigns
  console.log('Updating MasterCampaigns...');
  const masterCampaigns = await prisma.masterCampaign.findMany({
    where: {
      OR: [
        { createdAt: { gte: cutoffDate } },
        { updatedAt: { gte: cutoffDate } },
      ]
    }
  });
  
  for (const mc of masterCampaigns) {
    await prisma.masterCampaign.update({
      where: { id: mc.id },
      data: {
        createdAt: mc.createdAt >= cutoffDate ? rollbackYear(mc.createdAt) : mc.createdAt,
      }
    });
  }
  console.log(`  Updated ${masterCampaigns.length} master campaigns`);

  console.log('\n=== Rollback Complete! ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
