import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Check leads
  const totalLeads = await prisma.lead.count();
  const assignedLeads = await prisma.lead.count({ where: { assignedToId: { not: null } } });
  const enrolledLeads = await prisma.lead.count({ where: { enrolled: true } });
  const contactedLeads = await prisma.lead.count({ where: { contacted: true } });
  
  // Check leads by assignee
  const leadsByAssignee = await prisma.lead.groupBy({
    by: ['assignedToId'],
    _count: true
  });
  
  // Get user names for assignees
  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, role: true }
  });
  const userMap = new Map(users.map(u => [u.id, u]));
  
  console.log('=== DATABASE STATE ===');
  console.log('Total leads:', totalLeads);
  console.log('Assigned leads:', assignedLeads);
  console.log('Contacted leads:', contactedLeads);
  console.log('Enrolled leads:', enrolledLeads);
  console.log('');
  
  console.log('=== USERS IN DB ===');
  users.forEach(u => {
    console.log(`  ${u.name.padEnd(20)} | ${u.username.padEnd(15)} | ${u.role}`);
  });
  console.log('');
  
  console.log('=== LEADS BY ASSIGNEE ===');
  for (const g of leadsByAssignee) {
    const user = g.assignedToId ? userMap.get(g.assignedToId) : null;
    console.log(`  ${(user?.name || 'UNASSIGNED (null)').padEnd(20)} | ${g._count} leads`);
  }
  
  // Check courses
  const courses = await prisma.course.findMany({ 
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  console.log('');
  console.log('=== COURSES IN DB ===');
  console.log('Total courses:', courses.length);
  courses.forEach(c => console.log('  -', c.name));
  
  // Check campaigns
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, name: true, platform: true }
  });
  console.log('');
  console.log('=== CAMPAIGNS IN DB ===');
  console.log('Total campaigns:', campaigns.length);
  campaigns.forEach(c => console.log('  -', c.name, `(${c.platform})`));
  
  await prisma.$disconnect();
}

check().catch(console.error);
