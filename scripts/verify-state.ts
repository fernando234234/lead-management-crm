import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.count();
  const courses = await prisma.course.count();
  const enrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const contacted = await prisma.lead.count({ where: { status: 'CONTATTATO' } });
  const nuovo = await prisma.lead.count({ where: { status: 'NUOVO' } });
  
  // Count by course
  const byCourse = await prisma.lead.groupBy({
    by: ['courseId'],
    _count: { id: true },
    where: { status: 'ISCRITTO' }
  });
  
  // Get course names
  const courseList = await prisma.course.findMany({
    orderBy: { name: 'asc' }
  });
  
  console.log('='.repeat(50));
  console.log('FINAL DATABASE STATE');
  console.log('='.repeat(50));
  console.log(`Total leads:    ${leads}`);
  console.log(`Total courses:  ${courses}`);
  console.log('');
  console.log('Status breakdown:');
  console.log(`  ISCRITTO:     ${enrolled}`);
  console.log(`  CONTATTATO:   ${contacted}`);
  console.log(`  NUOVO:        ${nuovo}`);
  console.log('');
  console.log('Courses:');
  for (const c of courseList) {
    console.log(`  - ${c.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
