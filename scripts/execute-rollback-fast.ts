import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Rolling back 2026 dates to 2025 using raw SQL ===\n');
  
  // All date columns that need to be updated: subtract 1 year (interval '1 year')

  // 1. Update Lead dates
  console.log('Updating Lead dates...');
  
  const leadResults = await prisma.$executeRaw`
    UPDATE "Lead" 
    SET 
      "createdAt" = CASE WHEN "createdAt" >= '2026-01-01' THEN "createdAt" - INTERVAL '1 year' ELSE "createdAt" END,
      "contactedAt" = CASE WHEN "contactedAt" >= '2026-01-01' THEN "contactedAt" - INTERVAL '1 year' ELSE "contactedAt" END,
      "enrolledAt" = CASE WHEN "enrolledAt" >= '2026-01-01' THEN "enrolledAt" - INTERVAL '1 year' ELSE "enrolledAt" END,
      "appointmentDate" = CASE WHEN "appointmentDate" >= '2026-01-01' THEN "appointmentDate" - INTERVAL '1 year' ELSE "appointmentDate" END,
      "firstAttemptAt" = CASE WHEN "firstAttemptAt" >= '2026-01-01' THEN "firstAttemptAt" - INTERVAL '1 year' ELSE "firstAttemptAt" END,
      "lastAttemptAt" = CASE WHEN "lastAttemptAt" >= '2026-01-01' THEN "lastAttemptAt" - INTERVAL '1 year' ELSE "lastAttemptAt" END,
      "updatedAt" = CASE WHEN "updatedAt" >= '2026-01-01' THEN "updatedAt" - INTERVAL '1 year' ELSE "updatedAt" END
    WHERE "createdAt" >= '2026-01-01' 
       OR "contactedAt" >= '2026-01-01'
       OR "enrolledAt" >= '2026-01-01'
       OR "appointmentDate" >= '2026-01-01'
       OR "firstAttemptAt" >= '2026-01-01'
       OR "lastAttemptAt" >= '2026-01-01'
       OR "updatedAt" >= '2026-01-01'
  `;
  console.log(`  Updated ${leadResults} leads`);

  // 2. Update LeadActivity dates
  console.log('Updating LeadActivity dates...');
  const activityResults = await prisma.$executeRaw`
    UPDATE "LeadActivity" 
    SET "createdAt" = "createdAt" - INTERVAL '1 year'
    WHERE "createdAt" >= '2026-01-01'
  `;
  console.log(`  Updated ${activityResults} activities`);

  // 3. Update Notification dates
  console.log('Updating Notification dates...');
  const notificationResults = await prisma.$executeRaw`
    UPDATE "Notification" 
    SET "createdAt" = "createdAt" - INTERVAL '1 year'
    WHERE "createdAt" >= '2026-01-01'
  `;
  console.log(`  Updated ${notificationResults} notifications`);

  // 4. Update User dates
  console.log('Updating User dates...');
  const userResults = await prisma.$executeRaw`
    UPDATE "User" 
    SET 
      "createdAt" = CASE WHEN "createdAt" >= '2026-01-01' THEN "createdAt" - INTERVAL '1 year' ELSE "createdAt" END,
      "updatedAt" = CASE WHEN "updatedAt" >= '2026-01-01' THEN "updatedAt" - INTERVAL '1 year' ELSE "updatedAt" END
    WHERE "createdAt" >= '2026-01-01' 
       OR "updatedAt" >= '2026-01-01'
  `;
  console.log(`  Updated ${userResults} users`);

  // 5. Update MasterCampaign dates
  console.log('Updating MasterCampaign dates...');
  const masterCampaignResults = await prisma.$executeRaw`
    UPDATE "MasterCampaign" 
    SET 
      "createdAt" = CASE WHEN "createdAt" >= '2026-01-01' THEN "createdAt" - INTERVAL '1 year' ELSE "createdAt" END,
      "updatedAt" = CASE WHEN "updatedAt" >= '2026-01-01' THEN "updatedAt" - INTERVAL '1 year' ELSE "updatedAt" END
    WHERE "createdAt" >= '2026-01-01' 
       OR "updatedAt" >= '2026-01-01'
  `;
  console.log(`  Updated ${masterCampaignResults} master campaigns`);

  // 6. Update Task dates (just in case there are any)
  console.log('Updating Task dates...');
  const taskResults = await prisma.$executeRaw`
    UPDATE "Task" 
    SET 
      "dueDate" = CASE WHEN "dueDate" >= '2026-01-01' THEN "dueDate" - INTERVAL '1 year' ELSE "dueDate" END,
      "completedAt" = CASE WHEN "completedAt" >= '2026-01-01' THEN "completedAt" - INTERVAL '1 year' ELSE "completedAt" END,
      "createdAt" = CASE WHEN "createdAt" >= '2026-01-01' THEN "createdAt" - INTERVAL '1 year' ELSE "createdAt" END
    WHERE "dueDate" >= '2026-01-01' 
       OR "completedAt" >= '2026-01-01'
       OR "createdAt" >= '2026-01-01'
  `;
  console.log(`  Updated ${taskResults} tasks`);

  console.log('\n=== All remaining records rolled back! ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
