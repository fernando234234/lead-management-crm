import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTodayLeads() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  
  console.log("=== DELETE TODAY'S LEADS ===\n");
  console.log(dryRun ? "🔍 DRY RUN MODE (use --execute to actually delete)\n" : "⚠️  EXECUTE MODE - Will delete records!\n");

  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Find all leads created today
  const todaysLeads = await prisma.lead.findMany({
    where: { createdAt: { gte: today } },
    include: {
      course: { select: { name: true } },
      campaign: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📅 Date: ${today.toISOString().slice(0, 10)}`);
  console.log(`📊 Total leads to delete: ${todaysLeads.length}\n`);

  if (todaysLeads.length === 0) {
    console.log("✓ No leads found from today!");
    await prisma.$disconnect();
    return;
  }

  // Show summary
  console.log("--- LEADS TO BE DELETED ---\n");
  for (const lead of todaysLeads) {
    console.log(`${lead.name}`);
    console.log(`  ID: ${lead.id}`);
    console.log(`  Course: ${lead.course?.name || 'N/A'}`);
    console.log(`  Campaign: ${lead.campaign?.name || 'N/A'}`);
    console.log(`  Assigned: ${lead.assignedTo?.name || 'N/A'}`);
    console.log(`  Status: ${lead.status}`);
    console.log(`  Created: ${lead.createdAt.toISOString()}`);
    console.log('');
  }

  const leadIds = todaysLeads.map(l => l.id);

  if (dryRun) {
    console.log("=".repeat(50));
    console.log("🔍 DRY RUN - No changes made");
    console.log(`\nTo delete these ${todaysLeads.length} leads, run:`);
    console.log("  npx ts-node scripts/delete-today-leads.ts --execute");
    console.log("=".repeat(50));
  } else {
    console.log("⚠️  DELETING...\n");
    
    // Delete related activities first
    const activityDelete = await prisma.leadActivity.deleteMany({
      where: { leadId: { in: leadIds } }
    });
    console.log(`Deleted ${activityDelete.count} related activities`);

    // Delete related tasks
    const taskDelete = await prisma.task.deleteMany({
      where: { leadId: { in: leadIds } }
    });
    console.log(`Deleted ${taskDelete.count} related tasks`);

    // Delete the leads
    const leadDelete = await prisma.lead.deleteMany({
      where: { id: { in: leadIds } }
    });
    
    console.log(`\n✅ Successfully deleted ${leadDelete.count} leads from today`);
  }

  await prisma.$disconnect();
}

deleteTodayLeads().catch(e => {
  console.error(e);
  process.exit(1);
});
