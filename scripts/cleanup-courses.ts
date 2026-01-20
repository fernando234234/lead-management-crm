import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.course.count();
  console.log('Total Courses:', count);
  
  // Find courses created today (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const newCourses = await prisma.course.findMany({
    where: { createdAt: { gte: oneHourAgo } },
    select: { id: true, name: true }
  });
  console.log('New Courses Count:', newCourses.length);
  
  if (newCourses.length > 0) {
    const courseIds = newCourses.map(c => c.id);
    
    console.log('Cleaning up dependencies...');
    // Delete campaigns linked to these courses
    await prisma.campaign.deleteMany({
      where: { courseId: { in: courseIds } }
    });
    
    // Delete leads linked to these courses (should be none, but just in case)
    await prisma.lead.deleteMany({
      where: { courseId: { in: courseIds } }
    });

    console.log('Deleting courses...');
    await prisma.course.deleteMany({
      where: {
        id: { in: courseIds }
      }
    });
    console.log('Deleted.');
  }
}
main().finally(() => prisma.$disconnect());
