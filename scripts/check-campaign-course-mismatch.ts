import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkMismatch() {
  console.log('=== CHECKING CAMPAIGN-COURSE MISMATCHES ===\n');

  // Get all campaigns with their course and leads' courses
  const campaigns = await prisma.campaign.findMany({
    include: {
      course: { select: { id: true, name: true } },
      leads: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } }
        }
      },
      _count: { select: { leads: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Total campaigns: ${campaigns.length}\n`);

  const mismatches: typeof campaigns = [];

  for (const campaign of campaigns) {
    if (campaign.leads.length === 0) continue; // Skip empty campaigns

    // Get unique course IDs from leads
    const leadCourseIds = new Set(campaign.leads.map(l => l.course.id));
    const leadCourseNames = new Set(campaign.leads.map(l => l.course.name));

    // Check if campaign's course matches any of the leads' courses
    const campaignCourseId = campaign.course?.id;
    
    if (!campaignCourseId || !leadCourseIds.has(campaignCourseId)) {
      mismatches.push(campaign);
      
      console.log(`MISMATCH: "${campaign.name}"`);
      console.log(`  Campaign ID: ${campaign.id}`);
      console.log(`  Campaign Course: ${campaign.course?.name || 'NONE'} (${campaignCourseId || 'N/A'})`);
      console.log(`  Leads Count: ${campaign.leads.length}`);
      console.log(`  Lead Courses: ${[...leadCourseNames].join(', ')}`);
      
      // Show breakdown of leads by course
      const courseBreakdown = new Map<string, number>();
      for (const lead of campaign.leads) {
        const courseName = lead.course.name;
        courseBreakdown.set(courseName, (courseBreakdown.get(courseName) || 0) + 1);
      }
      console.log('  Breakdown:');
      for (const [courseName, count] of courseBreakdown.entries()) {
        console.log(`    - ${courseName}: ${count} leads`);
      }
      console.log('');
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total campaigns: ${campaigns.length}`);
  console.log(`Campaigns with mismatched courses: ${mismatches.length}`);

  await prisma.$disconnect();
}

checkMismatch();
