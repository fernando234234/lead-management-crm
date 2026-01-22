import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  // Create Motion Design course
  const course = await prisma.course.create({
    data: {
      name: 'Motion Design',
      price: 577
    }
  });
  console.log('Created course:', course.name, course.id);
  
  // Get default user
  const user = await prisma.user.findFirst({ where: { name: { contains: 'Simone' } } });
  
  // Create lead for ELISA ZAMPOLLO
  const lead = await prisma.lead.create({
    data: {
      name: 'ELISA ZAMPOLLO',
      courseId: course.id,
      status: 'ISCRITTO',
      enrolled: true,
      revenue: 577,
      source: 'MANUAL',
      assignedToId: user?.id || ''
    }
  });
  console.log('Created lead:', lead.name);
  
  // Final count
  const count = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  console.log('Total enrolled:', count);
  
  await prisma.$disconnect();
}

run().catch(console.error);
