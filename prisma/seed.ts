import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with essential users only...');
  console.log('');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { username: 'admin.' }
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists, skipping seed.');
    return;
  }

  // ============ USERS ONLY ============
  console.log('Creating essential users...');
  
  const adminPassword = await hash('admin123', 12);
  const userPassword = await hash('user123', 12);

  await prisma.user.create({
    data: {
      username: 'admin.',
      email: 'admin@leadcrm.it',
      name: 'Admin Sistema',
      password: adminPassword,
      role: 'ADMIN' as any,
    },
  });

  await prisma.user.create({
    data: {
      username: 'commerciale.',
      email: 'commerciale@leadcrm.it',
      name: 'Commerciale Default',
      password: userPassword,
      role: 'COMMERCIAL' as any,
      mustChangePassword: true,
    },
  });

  await prisma.user.create({
    data: {
      username: 'marketing.',
      email: 'marketing@leadcrm.it',
      name: 'Marketing Default',
      password: userPassword,
      role: 'MARKETING' as any,
    },
  });

  console.log(`✅ Created 3 essential users`);

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   - 3 Users (1 Admin, 1 Commercial, 1 Marketing)');
  console.log('   - NO mock courses (import from CSV)');
  console.log('   - NO mock leads (import from CSV)');
  console.log('   - NO mock campaigns');
  console.log('');
  console.log('📧 Default accounts (username / password):');
  console.log('   Admin:      admin. / admin123');
  console.log('   Commercial: commerciale. / user123');
  console.log('   Marketing:  marketing. / user123');
  console.log('');
  console.log('📌 Next steps:');
  console.log('   1. Import leads from CSV using scripts/import-final-csv.ts');
  console.log('   2. Create campaigns via the Marketing interface');
  console.log('   3. Create additional users via the Admin interface');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
