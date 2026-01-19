import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { role: 'asc' }, // Sort by role for better readability
    select: {
      name: true,
      email: true,
      role: true,
      password: true // Retrieving password field to show you
    }
  });

  console.log('--- User Accounts List ---');
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
