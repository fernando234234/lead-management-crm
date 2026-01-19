import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const todayLeads = await prisma.lead.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-01-18T00:00:00.000Z'),
        lt: new Date('2026-01-19T00:00:00.000Z')
      }
    },
    select: {
      id: true,
      name: true,
      source: true,
      course: { select: { name: true } },
      campaign: { select: { name: true } },
      updatedAt: true
    },
    take: 10
  });

  console.log(`Found ${todayLeads.length} leads from today (sample of 10):`);
  console.log(todayLeads);
  
  const sources = await prisma.lead.groupBy({
    by: ['source'],
    where: {
      createdAt: {
        gte: new Date('2026-01-18T00:00:00.000Z'),
        lt: new Date('2026-01-19T00:00:00.000Z')
      }
    },
    _count: true
  });
  console.log('Sources for today\'s leads:', sources);
}

main().catch(console.error).finally(() => prisma.$disconnect());
