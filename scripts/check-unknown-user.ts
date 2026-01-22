import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const userId = 'cmkmicxot00003ey4qsyzca18';
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (user) {
    console.log('Found user:', user.name, '| Role:', user.role, '| Username:', user.username);
  } else {
    console.log('User not found in database!');
  }
  
  const leads = await prisma.lead.findMany({ 
    where: { assignedToId: userId },
    take: 10,
    include: { course: true }
  });
  
  console.log(`\nLeads assigned to this ID: ${leads.length} (showing first 10)`);
  leads.forEach(l => console.log('  ' + l.name + ' | ' + l.course?.name + ' | ' + l.status));
  
  await prisma.$disconnect();
}

run().catch(console.error);
