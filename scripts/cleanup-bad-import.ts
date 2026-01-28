import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupBadImport() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  
  console.log("=== BAD IMPORT CLEANUP SCRIPT ===\n");
  console.log(dryRun ? "🔍 DRY RUN MODE (use --execute to actually delete)\n" : "⚠️  EXECUTE MODE - Will delete records!\n");

  // Find leads created TODAY with missing emails
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const recentBadLeads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: today },
      OR: [
        { email: null },
        { email: '' }
      ]
    },
    include: {
      course: { select: { name: true } },
      campaign: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📅 Leads created TODAY (${today.toISOString().slice(0,10)}) with missing email: ${recentBadLeads.length}\n`);

  if (recentBadLeads.length === 0) {
    console.log("✓ No bad leads found from today!");
    await prisma.$disconnect();
    return;
  }

  // Group by creation time to find bulk imports
  const byMinute: Record<string, typeof recentBadLeads> = {};
  for (const lead of recentBadLeads) {
    const key = lead.createdAt.toISOString().slice(0, 16);
    if (!byMinute[key]) byMinute[key] = [];
    byMinute[key].push(lead);
  }

  console.log("Bulk import batches found:");
  for (const [time, leads] of Object.entries(byMinute).sort((a, b) => b[0].localeCompare(a[0]))) {
    console.log(`  ${time}: ${leads.length} leads`);
  }

  console.log("\n--- Leads to be deleted ---\n");
  for (const lead of recentBadLeads) {
    console.log(`ID: ${lead.id}`);
    console.log(`  Name: ${lead.name}`);
    console.log(`  Course: ${lead.course?.name || 'N/A'}`);
    console.log(`  Campaign: ${lead.campaign?.name || 'N/A'}`);
    console.log(`  Assigned: ${lead.assignedTo?.name || 'N/A'}`);
    console.log(`  Status: ${lead.status}`);
    console.log(`  Created: ${lead.createdAt.toISOString()}`);
    console.log('');
  }

  // Valid statuses are: NUOVO, CONTATTATO, IN_TRATTATIVA, ISCRITTO, PERSO
  // No need to check for invalid status - Prisma enforces the enum

  if (dryRun) {
    console.log("\n" + "=".repeat(50));
    console.log("🔍 DRY RUN - No changes made");
    console.log(`\nTo delete these ${recentBadLeads.length} leads, run:`);
    console.log("  npx ts-node scripts/cleanup-bad-import.ts --execute");
    console.log("=".repeat(50));
  } else {
    console.log("\n⚠️  DELETING LEADS...\n");
    
    // Delete related activities first
    const activityDelete = await prisma.leadActivity.deleteMany({
      where: { leadId: { in: recentBadLeads.map(l => l.id) } }
    });
    console.log(`Deleted ${activityDelete.count} related activities`);

    // Delete related tasks
    const taskDelete = await prisma.task.deleteMany({
      where: { leadId: { in: recentBadLeads.map(l => l.id) } }
    });
    console.log(`Deleted ${taskDelete.count} related tasks`);

    // Delete the leads
    const leadDelete = await prisma.lead.deleteMany({
      where: { id: { in: recentBadLeads.map(l => l.id) } }
    });
    console.log(`\n✅ Deleted ${leadDelete.count} leads`);
  }

  await prisma.$disconnect();
}

cleanupBadImport().catch(e => {
  console.error(e);
  process.exit(1);
});
