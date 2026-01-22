import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function unenrollRemaining() {
  // These are the names that don't match CSV exactly but were kept by fuzzy matching
  // They are duplicates of the correct entries added from CSV
  const namesToUnenroll = [
    'elena basilico',
    'Rodrigo Coppola',
    'Navida Priyadhasini Juggapah',
    'Nketsia Kweku',
    'Giuseppe Castrì',
    'Anna Pettinato',
    'Isabella Marcheggiani',
    'Claudia Cortellazzi',
    'Celloni Alessia',
    'emmanuela lalicata',
    'Francesca Cataldo',
  ];
  
  console.log('=== UN-ENROLLING REMAINING DUPLICATES ===\n');
  
  let totalUnenrolled = 0;
  let totalRevenue = 0;
  
  for (const name of namesToUnenroll) {
    const leads = await prisma.lead.findMany({
      where: {
        name: { equals: name, mode: 'insensitive' },
        status: 'ISCRITTO'
      },
      include: { course: true }
    });
    
    if (leads.length > 0) {
      for (const lead of leads) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'CONTATTATO',
            enrolled: false,
            revenue: 0
          }
        });
        console.log(`✓ Un-enrolled: ${lead.name} | ${lead.course?.name} | €${lead.revenue}`);
        totalUnenrolled++;
        totalRevenue += Number(lead.revenue || 0);
      }
    }
  }
  
  console.log(`\nUn-enrolled: ${totalUnenrolled}`);
  console.log(`Revenue removed: €${totalRevenue}`);
  
  // Final stats
  const enrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const revenue = await prisma.lead.aggregate({ _sum: { revenue: true } });
  
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Total enrolled: ${enrolled}`);
  console.log(`Total revenue: €${revenue._sum.revenue}`);
  
  await prisma.$disconnect();
}

unenrollRemaining();
