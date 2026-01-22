import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SKIPPED_STUDENTS = [
  { name: 'Serena Cerioni', course: 'Social Media Manager' },
  { name: 'Alice Rossi', course: 'Social Media Manager' },
  { name: 'Elisa Eleonora Milano', course: 'Masterclass Graphic Web Design' },
  { name: 'Mena Panariello', course: 'Masterclass Graphic Web Design' },
  { name: 'Francesco De Lorenzis', course: 'Masterclass Ai' },
  { name: 'Elena Villella', course: 'Masterclass Graphic Web Design' },
  { name: 'Clementina Dellacasa', course: 'Masterclass Ai' },
];

async function main() {
  console.log('=== VERIFYING SKIPPED STUDENTS ===\n');
  
  for (const student of SKIPPED_STUDENTS) {
    // Search by last name (more reliable)
    const lastName = student.name.split(' ').pop() || student.name;
    
    const leads = await prisma.lead.findMany({
      where: {
        name: { contains: lastName, mode: 'insensitive' },
      },
      select: {
        name: true,
        status: true,
        enrolled: true,
        course: { select: { name: true } },
        revenue: true,
        assignedTo: { select: { name: true } }
      }
    });
    
    console.log(`${student.name} (${student.course}):`);
    if (leads.length === 0) {
      console.log(`  NOT FOUND!`);
    } else {
      leads.forEach(l => {
        const statusOk = l.status === 'ISCRITTO' ? '✓' : '✗';
        console.log(`  ${statusOk} ${l.name} - ${l.course?.name} - status: ${l.status} - enrolled: ${l.enrolled} - €${l.revenue} - ${l.assignedTo?.name || 'No commercial'}`);
      });
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
