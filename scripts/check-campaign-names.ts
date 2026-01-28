import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkNames() {
  console.log('=== CHECKING CAMPAIGN NAME VS COURSE ALIGNMENT ===\n');

  const campaigns = await prisma.campaign.findMany({
    include: {
      course: { select: { id: true, name: true } },
      _count: { select: { leads: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Total campaigns: ${campaigns.length}\n`);
  console.log('All campaigns with their courses:\n');

  for (const c of campaigns) {
    const courseName = c.course?.name || 'NO COURSE';
    const nameContainsCourse = c.name.toLowerCase().includes(courseName.toLowerCase()) ||
                               courseName.toLowerCase().includes(c.name.toLowerCase().replace(/meta|google|linkedin|tiktok|-|_/gi, '').trim());
    
    const flag = nameContainsCourse ? '✓' : '⚠️';
    
    console.log(`${flag} ${c.name}`);
    console.log(`   Course: ${courseName}`);
    console.log(`   Platform: ${c.platform}`);
    console.log(`   Leads: ${c._count.leads}`);
    console.log('');
  }

  await prisma.$disconnect();
}

checkNames();
