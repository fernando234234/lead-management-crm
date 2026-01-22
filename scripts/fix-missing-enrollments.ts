import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMissingEnrollments() {
  const fixes = [
    { name: 'Francesco De Lorenzis', course: 'Masterclass Ai', price: 577 },
    { name: 'Elena Villella', course: 'Masterclass Graphic Web Design', price: 2377 },
    { name: 'Clementina Dellacasa', course: 'Masterclass Ai', price: 577 },
  ];

  console.log('=== FIXING MISSING ENROLLMENTS ===\n');
  let totalNewRevenue = 0;
  let fixed = 0;

  for (const fix of fixes) {
    // Find by exact course and similar name (case insensitive)
    const leads = await prisma.lead.findMany({
      where: {
        course: { name: fix.course },
        status: { not: 'ISCRITTO' },
        name: { contains: fix.name.split(' ')[0], mode: 'insensitive' }
      },
      include: { course: true, assignedTo: true }
    });

    // Find best match by name
    const match = leads.find(l => {
      const leadName = l.name.toLowerCase();
      const searchName = fix.name.toLowerCase();
      return leadName.includes(searchName) || searchName.includes(leadName);
    });

    if (match) {
      await prisma.lead.update({
        where: { id: match.id },
        data: {
          status: 'ISCRITTO',
          enrolled: true,
          revenue: fix.price
        }
      });
      console.log(`✓ ${fix.name} - ${fix.course}`);
      console.log(`  Found: ${match.name}`);
      console.log(`  Updated to ISCRITTO - €${fix.price}`);
      console.log(`  Assigned to: ${match.assignedTo?.name || 'unassigned'}\n`);
      totalNewRevenue += fix.price;
      fixed++;
    } else {
      console.log(`✗ ${fix.name} - ${fix.course} - NOT FOUND in non-enrolled leads\n`);
    }
  }

  console.log('--- Summary ---');
  console.log(`Fixed: ${fixed}/${fixes.length}`);
  console.log(`New revenue added: €${totalNewRevenue}`);

  // Get final counts
  const enrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const revenue = await prisma.lead.aggregate({ _sum: { revenue: true } });
  console.log(`\nTotal enrolled: ${enrolled}`);
  console.log(`Total revenue: €${revenue._sum.revenue}`);

  await prisma.$disconnect();
}

fixMissingEnrollments().catch(console.error);
