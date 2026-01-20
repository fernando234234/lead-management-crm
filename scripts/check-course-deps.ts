import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const newCourses = await prisma.course.findMany({
    where: { createdAt: { gte: oneHourAgo } },
    include: {
      _count: {
        select: { leads: true, campaigns: true }
      }
    }
  });

  console.log(`Found ${newCourses.length} new courses.`);
  
  const withDeps = newCourses.filter(c => c._count.leads > 0 || c._count.campaigns > 0);
  console.log(`Courses with dependencies: ${withDeps.length}`);
  
  withDeps.forEach(c => {
    console.log(`- ${c.name}: Leads=${c._count.leads}, Campaigns=${c._count.campaigns}`);
  });
}

main().finally(() => prisma.$disconnect());
