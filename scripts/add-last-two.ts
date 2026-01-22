import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get Raffaele user
  const raffaele = await prisma.user.findFirst({ 
    where: { username: 'raffaele.' } 
  });
  
  if (!raffaele) {
    console.log('Raffaele not found!');
    return;
  }
  
  // Get Masterclass Graphic Web Design course
  const course = await prisma.course.findFirst({
    where: { name: 'Masterclass Graphic Web Design' }
  });
  
  if (!course) {
    console.log('Course not found!');
    return;
  }
  
  const students = [
    { name: 'Domenico Cangialosi', price: 2377 },
    { name: 'Raffaella Carolla', price: 2377 },
  ];
  
  for (const s of students) {
    await prisma.lead.create({
      data: {
        name: s.name,
        courseId: course.id,
        assignedToId: raffaele.id,
        status: 'ISCRITTO',
        enrolled: true,
        revenue: s.price,
        source: 'MANUAL'
      }
    });
    console.log(`✓ Added ${s.name} | €${s.price} | Raffaele`);
  }
  
  // Final stats
  const enrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const revenue = await prisma.lead.aggregate({ _sum: { revenue: true } });
  console.log(`\nTotal enrolled: ${enrolled}`);
  console.log(`Total revenue: €${revenue._sum.revenue}`);
  
  await prisma.$disconnect();
}

main();
