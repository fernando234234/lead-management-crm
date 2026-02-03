import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';

// Load .env file
config();

const prisma = new PrismaClient();

async function main() {
  console.log('Creating demo commercial account...');
  
  const password = await hash('demo123', 12);

  // Check if user already exists
  const existing = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: 'demo.commercial@leadcrm.it' },
        { username: 'demo.commercial' }
      ]
    }
  });

  if (existing) {
    console.log('Demo commercial user already exists!');
    console.log(`Email: ${existing.email}`);
    console.log(`Username: ${existing.username}`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      username: 'demo.commercial',
      email: 'demo.commercial@leadcrm.it',
      name: 'Demo Commerciale',
      password: password,
      role: 'COMMERCIAL' as any,
      mustChangePassword: false, // No password change required for demo
    },
  });

  console.log('');
  console.log('✅ Demo commercial user created successfully!');
  console.log('');
  console.log('📧 Login credentials:');
  console.log('   Email:    demo.commercial@leadcrm.it');
  console.log('   Password: demo123');
  console.log('');
  console.log('This user has NO leads assigned, perfect for testing the "Recupera Lead Perso" feature.');
}

main()
  .catch((e) => {
    console.error('❌ Failed to create demo user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
