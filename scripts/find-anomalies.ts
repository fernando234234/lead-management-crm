import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAnomalies() {
  console.log("=== ANOMALY DETECTION REPORT ===\n");

  // 1. Get all commercials (valid assignees)
  const commercials = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true, email: true }
  });
  const commercialIds = commercials.map(c => c.id);
  console.log(`✓ Found ${commercials.length} valid commercials:`);
  commercials.forEach(c => console.log(`  - ${c.name || c.email} (${c.id})`));

  // 2. Get all courses
  const courses = await prisma.course.findMany({
    select: { id: true, name: true }
  });
  const courseIds = courses.map(c => c.id);
  console.log(`\n✓ Found ${courses.length} valid courses:`);
  courses.forEach(c => console.log(`  - ${c.name} (${c.id})`));

  // 3. Get all campaigns
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, name: true }
  });
  const campaignIds = campaigns.map(c => c.id);
  console.log(`\n✓ Found ${campaigns.length} valid campaigns:`);
  campaigns.forEach(c => console.log(`  - ${c.name} (${c.id})`));

  // 4. Find leads with issues
  const allLeads = await prisma.lead.findMany({
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      course: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n✓ Total leads in database: ${allLeads.length}`);

  // Check for anomalies
  const anomalies: any[] = [];

  for (const lead of allLeads) {
    const issues: string[] = [];

    // Check: Assigned to non-commercial
    if (lead.assignedTo && lead.assignedTo.role !== 'COMMERCIAL') {
      issues.push(`Assigned to non-commercial: ${lead.assignedTo.name || lead.assignedTo.email} (role: ${lead.assignedTo.role})`);
    }

    // Check: Missing required fields
    if (!lead.name || lead.name.trim() === '') {
      issues.push('Missing name');
    }

    // Check: Invalid email format (if present)
    if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      issues.push(`Invalid email format: ${lead.email}`);
    }

    // Check: Missing email entirely
    if (!lead.email || lead.email.trim() === '') {
      issues.push('Missing email');
    }

    // Check: Invalid phone (if present) - should be digits, spaces, +, -, ()
    if (lead.phone && !/^[\d\s\+\-\(\)\.]+$/.test(lead.phone)) {
      issues.push(`Suspicious phone format: ${lead.phone}`);
    }

    // Check: No course assigned
    if (!lead.courseId) {
      issues.push('No course assigned');
    }

    // Check: No campaign assigned
    if (!lead.campaignId) {
      issues.push('No campaign assigned');
    }

    // Check: Weird status values (should be enum but check anyway)
    const validStatuses = ['NUOVO', 'CONTATTATO', 'QUALIFICATO', 'OPPORTUNITA', 'CONVERTITO', 'PERSO'];
    if (lead.status && !validStatuses.includes(lead.status)) {
      issues.push(`Invalid status: ${lead.status}`);
    }

    // Check: Future dates
    if (lead.createdAt > new Date()) {
      issues.push(`Future createdAt: ${lead.createdAt}`);
    }

    // Check: Duplicate email (mark for later)
    if (lead.email) {
      const duplicates = allLeads.filter(l => l.email === lead.email && l.id !== lead.id);
      if (duplicates.length > 0) {
        issues.push(`Duplicate email (${duplicates.length} other leads with same email)`);
      }
    }

    if (issues.length > 0) {
      anomalies.push({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        courseId: lead.courseId,
        courseName: lead.course?.name,
        campaignId: lead.campaignId,
        campaignName: lead.campaign?.name,
        assignedTo: lead.assignedTo?.name || lead.assignedTo?.email,
        createdAt: lead.createdAt,
        issues
      });
    }
  }

  // 5. Analyze creation patterns (bulk import detection)
  console.log("\n=== CREATION PATTERN ANALYSIS ===");
  const creationTimes: Record<string, number> = {};
  for (const lead of allLeads) {
    const timeKey = lead.createdAt.toISOString().slice(0, 16); // Per-minute grouping
    creationTimes[timeKey] = (creationTimes[timeKey] || 0) + 1;
  }

  const bulkImports = Object.entries(creationTimes)
    .filter(([_, count]) => count >= 5)
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

  if (bulkImports.length > 0) {
    console.log("\n⚠️  Potential bulk imports detected (5+ leads created same minute):");
    for (const [time, count] of bulkImports) {
      console.log(`  - ${time}: ${count} leads`);
    }
  } else {
    console.log("✓ No bulk imports detected");
  }

  // 6. Show anomalies
  console.log("\n=== ANOMALOUS LEADS ===");
  if (anomalies.length === 0) {
    console.log("✓ No anomalies found!");
  } else {
    console.log(`⚠️  Found ${anomalies.length} leads with issues:\n`);
    for (const a of anomalies.slice(0, 50)) { // Show first 50
      console.log(`ID: ${a.id}`);
      console.log(`  Name: ${a.name || '(empty)'}`);
      console.log(`  Email: ${a.email || '(empty)'}`);
      console.log(`  Phone: ${a.phone || 'N/A'}`);
      console.log(`  Course: ${a.courseName || 'N/A'}`);
      console.log(`  Campaign: ${a.campaignName || 'N/A'}`);
      console.log(`  Assigned: ${a.assignedTo || 'N/A'}`);
      console.log(`  Created: ${a.createdAt}`);
      console.log(`  Issues:`);
      a.issues.forEach((i: string) => console.log(`    - ${i}`));
      console.log('');
    }
    if (anomalies.length > 50) {
      console.log(`... and ${anomalies.length - 50} more`);
    }
  }

  // 7. Summary of IDs to potentially delete
  console.log("\n=== SUMMARY ===");
  const criticalAnomalies = anomalies.filter(a => 
    a.issues.some((i: string) => 
      i.includes('Missing name') || 
      i.includes('Missing email') ||
      i.includes('Invalid email')
    )
  );
  
  if (criticalAnomalies.length > 0) {
    console.log(`\n🗑️  ${criticalAnomalies.length} leads with CRITICAL issues (missing/invalid required fields):`);
    console.log("\nIDs that could be deleted:");
    criticalAnomalies.forEach(a => console.log(`  ${a.id} - ${a.name || '(no name)'} - ${a.email || '(no email)'}`));
  }

  // 8. Recent leads (last 7 days) for review
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentLeads = allLeads.filter(l => l.createdAt > oneWeekAgo);
  console.log(`\n📅 Leads created in last 7 days: ${recentLeads.length}`);
  
  // Group by day
  const byDay: Record<string, typeof recentLeads> = {};
  for (const l of recentLeads) {
    const day = l.createdAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(l);
  }
  
  for (const [day, leads] of Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]))) {
    console.log(`\n  ${day}: ${leads.length} leads`);
    if (leads.length <= 10) {
      leads.forEach(l => console.log(`    - ${l.name} (${l.email || 'no email'})`));
    }
  }

  // 9. Check for leads without valid course/campaign references
  console.log("\n=== ORPHANED REFERENCES CHECK ===");
  const leadsWithBadCourse = allLeads.filter(l => l.courseId && !l.course);
  const leadsWithBadCampaign = allLeads.filter(l => l.campaignId && !l.campaign);
  
  if (leadsWithBadCourse.length > 0) {
    console.log(`⚠️  ${leadsWithBadCourse.length} leads reference non-existent courses`);
  }
  if (leadsWithBadCampaign.length > 0) {
    console.log(`⚠️  ${leadsWithBadCampaign.length} leads reference non-existent campaigns`);
  }
  if (leadsWithBadCourse.length === 0 && leadsWithBadCampaign.length === 0) {
    console.log("✓ All course/campaign references are valid");
  }

  await prisma.$disconnect();
}

findAnomalies().catch(e => {
  console.error(e);
  process.exit(1);
});
