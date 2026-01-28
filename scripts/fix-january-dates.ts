import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dryRun = !process.argv.includes('--execute');
  
  console.log('=== Fix January 2025 → January 2026 (Undo Rollback) ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN (use --execute to apply)' : 'EXECUTING'}\n`);

  // Count leads that will be affected
  const jan2025Leads = await prisma.lead.count({
    where: {
      createdAt: {
        gte: new Date('2025-01-01'),
        lt: new Date('2025-02-01')
      }
    }
  });

  console.log(`Leads in January 2025 (to be fixed): ${jan2025Leads}`);

  // Show some samples
  const samples = await prisma.lead.findMany({
    where: {
      createdAt: {
        gte: new Date('2025-01-01'),
        lt: new Date('2025-02-01')
      }
    },
    take: 5,
    select: { id: true, name: true, createdAt: true }
  });

  console.log('\nSample leads to fix:');
  samples.forEach(l => {
    const newDate = new Date(l.createdAt);
    newDate.setFullYear(newDate.getFullYear() + 1);
    console.log(`  ${l.name}: ${l.createdAt.toISOString().slice(0, 10)} → ${newDate.toISOString().slice(0, 10)}`);
  });

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes made. Run with --execute to apply.');
    return;
  }

  // Execute the fix
  console.log('\n🔧 Fixing dates...');
  
  const result = await prisma.$executeRaw`
    UPDATE "Lead" 
    SET 
      "createdAt" = "createdAt" + INTERVAL '1 year',
      "updatedAt" = NOW()
    WHERE "createdAt" >= '2025-01-01' 
      AND "createdAt" < '2025-02-01'
  `;

  console.log(`✅ Updated ${result} leads`);

  // Also fix any related timestamps that were rolled back
  console.log('\n🔧 Fixing related activity dates...');
  const activityResult = await prisma.$executeRaw`
    UPDATE "LeadActivity" 
    SET "createdAt" = "createdAt" + INTERVAL '1 year'
    WHERE "createdAt" >= '2025-01-01' 
      AND "createdAt" < '2025-02-01'
  `;
  console.log(`✅ Updated ${activityResult} activities`);

  // Verify
  const afterCount = await prisma.lead.count({
    where: {
      createdAt: {
        gte: new Date('2026-01-01'),
        lt: new Date('2026-02-01')
      }
    }
  });
  console.log(`\n📊 Leads now in January 2026: ${afterCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
