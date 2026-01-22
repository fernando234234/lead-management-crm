import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== ROLLBACK: Undoing contracts import ===\n');
  
  // Get counts before
  const beforeLeads = await prisma.lead.count();
  const beforeEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  
  console.log(`Before rollback:`);
  console.log(`  Total leads: ${beforeLeads}`);
  console.log(`  Enrolled: ${beforeEnrolled}`);
  
  // Delete leads that have the note pattern from our import
  const deleted = await prisma.lead.deleteMany({
    where: {
      notes: {
        contains: 'Imported from contracts'
      }
    }
  });
  
  console.log(`\nDeleted ${deleted.count} leads imported from contracts`);
  
  // Delete the new users we created
  const deletedRaffaele = await prisma.user.deleteMany({
    where: { username: 'raffaele.' }
  });
  
  const deletedBenedetta = await prisma.user.deleteMany({
    where: { username: 'benedetta.' }
  });
  
  console.log(`Deleted users: raffaele. (${deletedRaffaele.count}), benedetta. (${deletedBenedetta.count})`);
  
  // Revert course prices
  await prisma.course.updateMany({
    where: { name: 'Brand Communication' },
    data: { price: 0 }
  });
  
  await prisma.course.updateMany({
    where: { name: 'Masterclass in Game Design' },
    data: { price: 0 }
  });
  
  await prisma.course.updateMany({
    where: { name: 'Attività Individuale' },
    data: { price: 0 }
  });
  
  console.log(`Reverted course prices to €0 for: Brand Communication, Masterclass in Game Design, Attività Individuale`);
  
  // Get counts after
  const afterLeads = await prisma.lead.count();
  const afterEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const totalRevenue = await prisma.lead.aggregate({
    where: { status: 'ISCRITTO' },
    _sum: { revenue: true }
  });
  
  console.log(`\nAfter rollback:`);
  console.log(`  Total leads: ${afterLeads}`);
  console.log(`  Enrolled: ${afterEnrolled}`);
  console.log(`  Total revenue: €${totalRevenue._sum.revenue}`);
  
  // List remaining users
  const users = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { username: true, name: true }
  });
  console.log(`\nRemaining commercials:`);
  users.forEach(u => console.log(`  ${u.username} -> ${u.name}`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
