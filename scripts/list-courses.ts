import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({ 
    select: { name: true },
    orderBy: { name: 'asc' }
  });
  console.log('Courses in DB:');
  courses.forEach(c => console.log(`  ${c.name}`));
  await prisma.$disconnect();
}
main();
