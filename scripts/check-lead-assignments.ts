import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  // Get all leads
  const totalLeads = await prisma.lead.count();
  
  // Get leads without assignment
  const unassigned = await prisma.lead.count({
    where: { assignedToId: null }
  });
  
  // Get leads by commerciale
  const byCommerciale = await prisma.lead.groupBy({
    by: ['assignedToId'],
    _count: true,
  });
  
  // Get user names
  const users = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true }
  });
  const userMap = new Map(users.map(u => [u.id, u.name]));
  
  console.log('=== LEAD ASSIGNMENTS ===\n');
  console.log(`Total leads: ${totalLeads}`);
  console.log(`Unassigned: ${unassigned}`);
  console.log(`Assigned: ${totalLeads - unassigned}\n`);
  
  console.log('By Commerciale:');
  let assigned = 0;
  for (const row of byCommerciale) {
    if (row.assignedToId) {
      const name = userMap.get(row.assignedToId) || row.assignedToId;
      console.log(`  ${name}: ${row._count}`);
      assigned += row._count;
    }
  }
  
  // Check enrolled leads specifically
  console.log('\n=== ENROLLED LEADS ===\n');
  
  const enrolledTotal = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const enrolledUnassigned = await prisma.lead.count({ 
    where: { status: 'ISCRITTO', assignedToId: null } 
  });
  
  console.log(`Total enrolled: ${enrolledTotal}`);
  console.log(`Enrolled unassigned: ${enrolledUnassigned}`);
  
  if (enrolledUnassigned > 0) {
    const unassignedEnrolled = await prisma.lead.findMany({
      where: { status: 'ISCRITTO', assignedToId: null },
      include: { course: true },
      take: 20
    });
    console.log('\nUnassigned enrolled leads (first 20):');
    unassignedEnrolled.forEach(l => {
      console.log(`  ${l.name} | ${l.course?.name}`);
    });
  }
  
  // Enrolled by commerciale
  const enrolledByComm = await prisma.lead.groupBy({
    by: ['assignedToId'],
    where: { status: 'ISCRITTO' },
    _count: true
  });
  
  console.log('\nEnrolled by Commerciale:');
  for (const row of enrolledByComm) {
    if (row.assignedToId) {
      const name = userMap.get(row.assignedToId) || row.assignedToId;
      console.log(`  ${name}: ${row._count}`);
    } else {
      console.log(`  (Unassigned): ${row._count}`);
    }
  }
  
  await prisma.$disconnect();
}

run().catch(console.error);
