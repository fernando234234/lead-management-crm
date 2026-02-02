import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const { hash } = bcrypt;

const prisma = new PrismaClient();

const NEW_PASSWORD = 'Commerciale2026!';

async function run() {
  console.log('🔐 Resetting passwords for all COMMERCIAL users...\n');
  
  // Find all commercial users
  const commercials = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true, username: true, email: true }
  });
  
  if (commercials.length === 0) {
    console.log('❌ No commercial users found.');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`Found ${commercials.length} commercial user(s):\n`);
  
  // Hash the new password
  const hashedPassword = await hash(NEW_PASSWORD, 12);
  
  // Update all commercial users
  for (const user of commercials) {
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        mustChangePassword: true
      }
    });
    
    console.log(`✅ ${user.name}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log(`   Must change on login: YES\n`);
  }
  
  console.log('─'.repeat(50));
  console.log(`\n🎉 Done! ${commercials.length} commercial user(s) reset.`);
  console.log(`\n📋 Summary:`);
  console.log(`   New password: ${NEW_PASSWORD}`);
  console.log(`   Must change on first login: YES`);
  console.log(`\n⚠️  Share these credentials securely with your team.`);
  
  await prisma.$disconnect();
}

run().catch(console.error);
