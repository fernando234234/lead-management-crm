import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const NEW_PASSWORD = 'CambiaMi2026!';

async function run() {
  const hashedPassword = await hash(NEW_PASSWORD, 12);
  
  const admin = await prisma.user.update({
    where: { id: 'cmkmicxot00003ey4qsyzca18' },
    data: { 
      password: hashedPassword,
      mustChangePassword: true
    }
  });
  
  console.log('Admin password reset:');
  console.log(`  Name: ${admin.name}`);
  console.log(`  Username: ${admin.username}`);
  console.log(`  Password: ${NEW_PASSWORD}`);
  console.log(`  Must change: yes`);
  
  await prisma.$disconnect();
}

run().catch(console.error);
