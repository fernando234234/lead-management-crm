import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (user) {
    // Bcrypt hash format: $2a$12$... 
    // The "12" is the cost factor.
    console.log('Sample password hash:', user.password);
    const parts = user.password.split('$');
    if (parts.length >= 3) {
      console.log('Cost factor (rounds):', parts[2]);
    } else {
      console.log('Unknown hash format');
    }
  } else {
    console.log('No users found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
