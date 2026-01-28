import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findDuplicateCampaigns() {
  console.log('=== FINDING DUPLICATE CAMPAIGNS ===\n');

  // Get all campaigns with their leads count and spend records
  const campaigns = await prisma.campaign.findMany({
    include: {
      course: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      spendRecords: true,
      _count: { select: { leads: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Total campaigns: ${campaigns.length}\n`);

  // Group campaigns by normalized name
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  
  const byName = new Map<string, typeof campaigns>();
  for (const c of campaigns) {
    const n = normalize(c.name);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n)!.push(c);
  }

  // Find duplicates (same name)
  const duplicatesByName = [...byName.entries()].filter(([_, list]) => list.length > 1);
  
  console.log('=== DUPLICATES BY NAME ===');
  console.log(`Groups with same name: ${duplicatesByName.length}\n`);
  
  if (duplicatesByName.length > 0) {
    for (const [name, list] of duplicatesByName) {
      console.log(`\n"${name}" (${list.length} campaigns):`);
      for (const c of list) {
        const totalSpend = c.spendRecords.reduce((sum, r) => sum + Number(r.amount), 0);
        console.log(`  - ID: ${c.id}`);
        console.log(`    Name: ${c.name}`);
        console.log(`    Course: ${c.course?.name || 'N/A'}`);
        console.log(`    Platform: ${c.platform}`);
        console.log(`    Status: ${c.status}`);
        console.log(`    Created: ${c.createdAt.toISOString().split('T')[0]}`);
        console.log(`    Created By: ${c.createdBy?.name || 'Unknown'}`);
        console.log(`    Leads: ${c._count.leads}`);
        console.log(`    Spend Records: ${c.spendRecords.length} (Total: €${totalSpend})`);
        console.log('');
      }
    }
  }

  // Also look for "Import - " campaigns which are auto-created during imports
  console.log('\n=== "Import -" CAMPAIGNS (Auto-created during imports) ===\n');
  const importCampaigns = campaigns.filter(c => c.name.startsWith('Import -') || c.name.startsWith('Import-'));
  
  if (importCampaigns.length > 0) {
    for (const c of importCampaigns) {
      const totalSpend = c.spendRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      console.log(`- ID: ${c.id}`);
      console.log(`  Name: ${c.name}`);
      console.log(`  Course: ${c.course?.name || 'N/A'}`);
      console.log(`  Platform: ${c.platform}`);
      console.log(`  Created: ${c.createdAt.toISOString().split('T')[0]}`);
      console.log(`  Leads: ${c._count.leads}`);
      console.log(`  Spend Records: ${c.spendRecords.length} (Total: €${totalSpend})`);
      console.log('');
    }
  } else {
    console.log('No "Import -" campaigns found.\n');
  }

  // Look for campaigns created recently (potential bad imports)
  console.log('\n=== RECENTLY CREATED CAMPAIGNS (Last 7 days) ===\n');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentCampaigns = campaigns.filter(c => c.createdAt >= sevenDaysAgo);
  
  if (recentCampaigns.length > 0) {
    console.log(`Found ${recentCampaigns.length} campaigns created in the last 7 days:\n`);
    for (const c of recentCampaigns) {
      const totalSpend = c.spendRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      console.log(`- ID: ${c.id}`);
      console.log(`  Name: ${c.name}`);
      console.log(`  Course: ${c.course?.name || 'N/A'}`);
      console.log(`  Platform: ${c.platform}`);
      console.log(`  Created: ${c.createdAt.toISOString()}`);
      console.log(`  Created By: ${c.createdBy?.name || 'Unknown'}`);
      console.log(`  Leads: ${c._count.leads}`);
      console.log(`  Spend Records: ${c.spendRecords.length} (Total: €${totalSpend})`);
      console.log('');
    }
  } else {
    console.log('No campaigns created in the last 7 days.\n');
  }

  // Look for campaigns with 0 leads (potentially orphaned from failed imports)
  console.log('\n=== CAMPAIGNS WITH 0 LEADS ===\n');
  const emptyCampaigns = campaigns.filter(c => c._count.leads === 0);
  
  if (emptyCampaigns.length > 0) {
    console.log(`Found ${emptyCampaigns.length} campaigns with 0 leads:\n`);
    for (const c of emptyCampaigns) {
      const totalSpend = c.spendRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      console.log(`- ID: ${c.id}`);
      console.log(`  Name: ${c.name}`);
      console.log(`  Course: ${c.course?.name || 'N/A'}`);
      console.log(`  Platform: ${c.platform}`);
      console.log(`  Status: ${c.status}`);
      console.log(`  Created: ${c.createdAt.toISOString().split('T')[0]}`);
      console.log(`  Created By: ${c.createdBy?.name || 'Unknown'}`);
      console.log(`  Spend Records: ${c.spendRecords.length} (Total: €${totalSpend})`);
      console.log('');
    }
  } else {
    console.log('No campaigns with 0 leads found.\n');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total campaigns: ${campaigns.length}`);
  console.log(`Duplicate name groups: ${duplicatesByName.length}`);
  console.log(`"Import -" campaigns: ${importCampaigns.length}`);
  console.log(`Recently created (7 days): ${recentCampaigns.length}`);
  console.log(`Campaigns with 0 leads: ${emptyCampaigns.length}`);

  await prisma.$disconnect();
}

findDuplicateCampaigns().catch(console.error);
