/**
 * Script to distribute campaign spend to individual leads based on their creation date.
 * 
 * Logic:
 * 1. For each campaign with spend records, get all leads
 * 2. Group leads by month
 * 3. Calculate pro-rata spend for each month
 * 4. Distribute monthly spend evenly across leads created in that month
 * 
 * Usage:
 *   node scripts/distribute-campaign-costs.js --dry-run   # Preview changes
 *   node scripts/distribute-campaign-costs.js --execute   # Apply changes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isExecute = args.includes('--execute');

if (!isDryRun && !isExecute) {
  console.log('Usage:');
  console.log('  node scripts/distribute-campaign-costs.js --dry-run   # Preview changes');
  console.log('  node scripts/distribute-campaign-costs.js --execute   # Apply changes');
  process.exit(1);
}

/**
 * Calculate pro-rata spend for a specific month based on spend records
 */
function calculateMonthlyProRataSpend(spendRecords, year, month) {
  const monthStart = new Date(year, month - 1, 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(year, month, 0); // Last day of month
  monthEnd.setHours(23, 59, 59, 999);
  
  let totalProRataAmount = 0;
  
  for (const record of spendRecords) {
    const recordStart = new Date(record.startDate);
    recordStart.setHours(0, 0, 0, 0);
    
    let recordEnd;
    if (record.endDate) {
      recordEnd = new Date(record.endDate);
    } else {
      recordEnd = new Date(); // Ongoing - use today
    }
    recordEnd.setHours(23, 59, 59, 999);
    
    // No overlap check
    if (recordEnd < monthStart || recordStart > monthEnd) {
      continue;
    }
    
    // Calculate total days in spend period
    const totalDays = Math.max(1, Math.ceil(
      (recordEnd.getTime() - recordStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1);
    
    // Calculate overlap days
    const overlapStart = new Date(Math.max(recordStart.getTime(), monthStart.getTime()));
    const overlapEnd = new Date(Math.min(recordEnd.getTime(), monthEnd.getTime()));
    const overlapDays = Math.max(1, Math.ceil(
      (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1);
    
    // Pro-rata amount
    const amount = Number(record.amount);
    const proRataAmount = amount * (overlapDays / totalDays);
    totalProRataAmount += proRataAmount;
  }
  
  return totalProRataAmount;
}

async function distributeCosts() {
  console.log('=== CAMPAIGN COST DISTRIBUTION ===');
  console.log('Mode:', isDryRun ? 'DRY RUN (no changes will be made)' : 'EXECUTE');
  console.log('');
  
  // Get all campaigns with spend records and leads
  const campaigns = await prisma.campaign.findMany({
    include: {
      spendRecords: true,
      leads: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          acquisitionCost: true,
        }
      }
    },
    where: {
      spendRecords: {
        some: {} // Has at least one spend record
      }
    }
  });
  
  console.log(`Found ${campaigns.length} campaigns with spend records\n`);
  
  let totalLeadsUpdated = 0;
  let totalCostDistributed = 0;
  const updates = []; // Store all updates for batch execution
  
  for (const campaign of campaigns) {
    if (campaign.leads.length === 0) {
      console.log(`⏭️  ${campaign.name}: No leads, skipping`);
      continue;
    }
    
    console.log(`\n📊 ${campaign.name}`);
    console.log(`   Spend Records: ${campaign.spendRecords.length}`);
    console.log(`   Total Leads: ${campaign.leads.length}`);
    
    // Group leads by month
    const leadsByMonth = {};
    for (const lead of campaign.leads) {
      const monthKey = lead.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!leadsByMonth[monthKey]) {
        leadsByMonth[monthKey] = [];
      }
      leadsByMonth[monthKey].push(lead);
    }
    
    // Process each month
    const monthKeys = Object.keys(leadsByMonth).sort();
    console.log(`   Months with leads: ${monthKeys.join(', ')}`);
    
    for (const monthKey of monthKeys) {
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      
      // Calculate pro-rata spend for this month
      const monthlySpend = calculateMonthlyProRataSpend(
        campaign.spendRecords, 
        year, 
        month
      );
      
      const leadsInMonth = leadsByMonth[monthKey];
      const costPerLead = leadsInMonth.length > 0 ? monthlySpend / leadsInMonth.length : 0;
      
      if (monthlySpend > 0) {
        console.log(`   ${monthKey}: €${monthlySpend.toFixed(2)} / ${leadsInMonth.length} leads = €${costPerLead.toFixed(2)}/lead`);
        
        // Queue updates
        for (const lead of leadsInMonth) {
          updates.push({
            leadId: lead.id,
            leadName: lead.name,
            campaignName: campaign.name,
            month: monthKey,
            oldCost: lead.acquisitionCost ? Number(lead.acquisitionCost) : null,
            newCost: costPerLead,
          });
          totalLeadsUpdated++;
          totalCostDistributed += costPerLead;
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total leads to update: ${totalLeadsUpdated}`);
  console.log(`Total cost to distribute: €${totalCostDistributed.toFixed(2)}`);
  console.log(`Average CPL: €${(totalCostDistributed / totalLeadsUpdated).toFixed(2)}`);
  
  if (isDryRun) {
    console.log('\n🔍 DRY RUN - Sample of updates (first 20):');
    updates.slice(0, 20).forEach(u => {
      console.log(`   ${u.leadName.substring(0, 25).padEnd(25)} | ${u.month} | €${u.newCost.toFixed(2)}`);
    });
    console.log('\nRun with --execute to apply these changes.');
  } else {
    console.log('\n⏳ Applying updates...');
    
    // Batch update in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      
      // Use transaction for each chunk
      await prisma.$transaction(
        chunk.map(u => 
          prisma.lead.update({
            where: { id: u.leadId },
            data: { acquisitionCost: u.newCost }
          })
        )
      );
      
      const progress = Math.min(i + chunkSize, updates.length);
      process.stdout.write(`\r   Updated ${progress}/${updates.length} leads...`);
    }
    
    console.log('\n\n✅ All updates applied successfully!');
  }
  
  await prisma.$disconnect();
}

distributeCosts().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
