import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmptyFields() {
  console.log("=== EMPTY/ANOMALOUS FIELDS CHECK ===\n");

  // Get today's leads
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const recentLeads = await prisma.lead.findMany({
    where: { createdAt: { gte: today } },
    include: {
      course: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📅 Leads created today: ${recentLeads.length}\n`);

  // Check for different types of anomalies
  const anomalies = {
    missingName: [] as typeof recentLeads,
    missingCourse: [] as typeof recentLeads,
    missingCampaign: [] as typeof recentLeads,
    missingBothPhoneAndEmail: [] as typeof recentLeads,
    invalidAssignment: [] as typeof recentLeads,
    duplicateNames: [] as typeof recentLeads,
  };

  // Track names for duplicate detection
  const nameCount: Record<string, typeof recentLeads> = {};

  for (const lead of recentLeads) {
    // Missing name (critical - this should never happen)
    if (!lead.name || lead.name.trim() === '') {
      anomalies.missingName.push(lead);
    }

    // Missing course (should be required)
    if (!lead.courseId || !lead.course) {
      anomalies.missingCourse.push(lead);
    }

    // Missing campaign
    if (!lead.campaignId || !lead.campaign) {
      anomalies.missingCampaign.push(lead);
    }

    // Missing BOTH phone AND email (can't contact them at all!)
    const hasPhone = lead.phone && lead.phone.trim() !== '';
    const hasEmail = lead.email && lead.email.trim() !== '';
    if (!hasPhone && !hasEmail) {
      anomalies.missingBothPhoneAndEmail.push(lead);
    }

    // Track names for duplicates
    const normalizedName = lead.name?.toLowerCase().trim() || '';
    if (normalizedName) {
      if (!nameCount[normalizedName]) nameCount[normalizedName] = [];
      nameCount[normalizedName].push(lead);
    }
  }

  // Find duplicates
  for (const [name, leads] of Object.entries(nameCount)) {
    if (leads.length > 1) {
      anomalies.duplicateNames.push(...leads);
    }
  }

  // Report
  console.log("=== ANOMALY SUMMARY ===\n");
  
  console.log(`❌ Missing NAME: ${anomalies.missingName.length}`);
  if (anomalies.missingName.length > 0) {
    anomalies.missingName.forEach(l => console.log(`  - ID: ${l.id} (created: ${l.createdAt.toISOString()})`));
  }

  console.log(`\n❌ Missing COURSE: ${anomalies.missingCourse.length}`);
  if (anomalies.missingCourse.length > 0) {
    anomalies.missingCourse.forEach(l => console.log(`  - ${l.name} (ID: ${l.id})`));
  }

  console.log(`\n⚠️  Missing CAMPAIGN: ${anomalies.missingCampaign.length}`);
  if (anomalies.missingCampaign.length > 0 && anomalies.missingCampaign.length <= 20) {
    anomalies.missingCampaign.forEach(l => console.log(`  - ${l.name} - Course: ${l.course?.name} (ID: ${l.id})`));
  }

  console.log(`\n⚠️  Missing BOTH phone AND email (no contact info!): ${anomalies.missingBothPhoneAndEmail.length}`);
  if (anomalies.missingBothPhoneAndEmail.length > 0 && anomalies.missingBothPhoneAndEmail.length <= 30) {
    anomalies.missingBothPhoneAndEmail.forEach(l => 
      console.log(`  - ${l.name} - Course: ${l.course?.name} - Assigned: ${l.assignedTo?.name || 'N/A'}`)
    );
  }

  console.log(`\n⚠️  Duplicate NAMES (same name, multiple entries today): ${anomalies.duplicateNames.length}`);
  // Group duplicates
  const dupGroups: Record<string, typeof recentLeads> = {};
  for (const l of anomalies.duplicateNames) {
    const key = l.name?.toLowerCase().trim() || '';
    if (!dupGroups[key]) dupGroups[key] = [];
    dupGroups[key].push(l);
  }
  for (const [name, leads] of Object.entries(dupGroups)) {
    console.log(`  "${name}" appears ${leads.length} times:`);
    leads.forEach(l => console.log(`    - ID: ${l.id} - Course: ${l.course?.name} - Created: ${l.createdAt.toISOString().slice(11,19)}`));
  }

  // Summary of what could be deleted
  console.log("\n=== DELETION CANDIDATES ===");
  
  const criticalIssues = new Set<string>();
  anomalies.missingName.forEach(l => criticalIssues.add(l.id));
  anomalies.missingCourse.forEach(l => criticalIssues.add(l.id));
  
  console.log(`\n🗑️  Leads with CRITICAL issues (missing name or course): ${criticalIssues.size}`);
  if (criticalIssues.size > 0) {
    console.log("IDs:");
    Array.from(criticalIssues).forEach(id => console.log(`  ${id}`));
  }

  // Also check for leads with no contact info that were bulk imported
  const bulkImportTime = '2026-01-28T18:48';
  const bulkImportLeads = recentLeads.filter(l => 
    l.createdAt.toISOString().startsWith(bulkImportTime)
  );
  
  console.log(`\n📦 Bulk import at ${bulkImportTime}: ${bulkImportLeads.length} leads`);
  const bulkNoContact = bulkImportLeads.filter(l => {
    const hasPhone = l.phone && l.phone.trim() !== '';
    const hasEmail = l.email && l.email.trim() !== '';
    return !hasPhone && !hasEmail;
  });
  console.log(`   Without ANY contact info: ${bulkNoContact.length}`);

  await prisma.$disconnect();
}

checkEmptyFields().catch(e => {
  console.error(e);
  process.exit(1);
});
