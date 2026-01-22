import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function reset() {
  console.log('Resetting only ISCRITTO leads to CONTATTATO...');
  const result = await prisma.lead.updateMany({
    where: { status: 'ISCRITTO' },
    data: {
      status: 'CONTATTATO',
      enrolled: false,
      revenue: 0
    }
  });
  console.log(`Reset ${result.count} leads from ISCRITTO to CONTATTATO`);
  await prisma.$disconnect();
}

reset();
