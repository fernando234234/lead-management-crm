import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== IMPORT VERIFICATION ===\n');

  // Check January 2026 stats
  const jan2026Stats = await prisma.lead.groupBy({
    by: ['status'],
    where: {
      createdAt: { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') }
    },
    _count: true
  });

  console.log('January 2026 leads by status:');
  jan2026Stats.forEach(s => {
    console.log(`  ${s.status}: ${s._count}`);
  });

  // Check enrolled leads imported today
  const enrolledToday = await prisma.lead.findMany({
    where: {
      createdAt: { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') },
      enrolled: true,
      source: 'LEGACY_IMPORT'
    },
    include: {
      course: { select: { name: true } },
      assignedTo: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log(`\nRecently imported enrolled leads: ${enrolledToday.length}`);
  enrolledToday.forEach(l => {
    console.log(`  ${l.name} | ${l.course?.name} | ${l.assignedTo?.name} | €${l.revenue || 0}`);
  });

  // Total revenue from January 2026 enrollments
  const totalRevenue = await prisma.lead.aggregate({
    where: {
      createdAt: { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') },
      enrolled: true
    },
    _sum: { revenue: true },
    _count: true
  });

  console.log(`\nJanuary 2026 enrollments: ${totalRevenue._count}`);
  console.log(`Total revenue: €${totalRevenue._sum.revenue || 0}`);

  await prisma.$disconnect();
}

main().catch(console.error);
