import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users:');
  users.forEach(u => console.log(`  ${u.name} (${u.username})`));
  await prisma.$disconnect();
}

main();
