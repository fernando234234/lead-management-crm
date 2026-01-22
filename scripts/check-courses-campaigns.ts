import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const courses = await prisma.course.findMany({ orderBy: { name: 'asc' } });
  const campaigns = await prisma.campaign.count();
  const masterCampaigns = await prisma.masterCampaign.count();
  
  console.log('=== CURRENT STATE ===\n');
  console.log(`Courses: ${courses.length}`);
  console.log(`Campaigns: ${campaigns}`);
  console.log(`Master Campaigns: ${masterCampaigns}`);
  
  console.log('\n=== ALL COURSES ===\n');
  courses.forEach(c => console.log(`  ${c.name}`));
  
  // Check which courses have leads
  const coursesWithLeads = await prisma.lead.groupBy({
    by: ['courseId'],
    _count: true
  });
  
  const courseLeadCount = new Map(coursesWithLeads.map(c => [c.courseId, c._count]));
  
  console.log('\n=== COURSES WITH LEADS ===\n');
  let usedCourses = 0;
  let unusedCourses = 0;
  
  for (const course of courses) {
    const count = courseLeadCount.get(course.id) || 0;
    if (count > 0) {
      usedCourses++;
    } else {
      unusedCourses++;
    }
  }
  
  console.log(`Used courses (have leads): ${usedCourses}`);
  console.log(`Unused courses (no leads): ${unusedCourses}`);
  
  await prisma.$disconnect();
}

run().catch(console.error);
