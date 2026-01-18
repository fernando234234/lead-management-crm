/**
 * Migration Script: Convert Legacy Import to Per-Course Campaigns
 * 
 * This script:
 * 1. Gets all courses that have leads
 * 2. Creates a "Legacy - [Course Name]" campaign for each
 * 3. Distributes the total legacy spend (€24,018) proportionally by lead count
 * 4. Updates each lead to point to its course's campaign
 * 5. Deletes the old single "Legacy Import" campaign
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TOTAL_LEGACY_SPEND = 24018; // Total from the original Legacy Import campaign
const LEGACY_CAMPAIGN_ID = 'cmkjiifem001ikslr21p2mt50'; // Original legacy campaign ID
const ADMIN_USER_ID = 'cmkhjmzox0000xmkxwqa92him'; // Admin Sistema

async function main() {
  console.log('🚀 Starting Legacy Campaign Migration...\n');

  // 1. Get all courses with their lead counts
  const coursesWithLeads = await prisma.course.findMany({
    where: {
      leads: {
        some: {}
      }
    },
    include: {
      _count: {
        select: { leads: true }
      }
    }
  });

  console.log(`📚 Found ${coursesWithLeads.length} courses with leads\n`);

  // 2. Calculate total leads for proportional spend distribution
  const totalLeads = coursesWithLeads.reduce((sum, c) => sum + c._count.leads, 0);
  console.log(`👥 Total leads: ${totalLeads}`);
  console.log(`💰 Total spend to distribute: €${TOTAL_LEGACY_SPEND}\n`);

  // 3. Create campaigns for each course and update leads
  const results: { course: string; leads: number; spend: number; campaignId: string }[] = [];

  for (const course of coursesWithLeads) {
    const leadCount = course._count.leads;
    const proportionalSpend = Math.round((leadCount / totalLeads) * TOTAL_LEGACY_SPEND * 100) / 100;

    console.log(`Processing: ${course.name}`);
    console.log(`  - Leads: ${leadCount}`);
    console.log(`  - Proportional spend: €${proportionalSpend}`);

    // Create the campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: `Legacy - ${course.name}`,
        platform: 'FACEBOOK', // Default platform for legacy
        courseId: course.id,
        createdById: ADMIN_USER_ID,
        budget: proportionalSpend,
        status: 'COMPLETED',
        startDate: new Date('2025-01-01'), // Approximate legacy start
        endDate: new Date('2025-12-31'),
      }
    });

    console.log(`  - Created campaign: ${campaign.id}`);

    // Create spend record for this campaign
    if (proportionalSpend > 0) {
      await prisma.campaignSpend.create({
        data: {
          campaignId: campaign.id,
          date: new Date('2025-06-15'), // Middle of year as average
          amount: proportionalSpend,
          notes: 'Legacy import - proportional spend distribution'
        }
      });
    }

    // Update all leads for this course to point to this campaign
    const updateResult = await prisma.lead.updateMany({
      where: {
        courseId: course.id
      },
      data: {
        campaignId: campaign.id
      }
    });

    console.log(`  - Updated ${updateResult.count} leads\n`);

    results.push({
      course: course.name,
      leads: leadCount,
      spend: proportionalSpend,
      campaignId: campaign.id
    });
  }

  // 4. Delete the old legacy campaign and its spend records
  console.log('🗑️  Cleaning up old Legacy Import campaign...');
  
  // First delete spend records
  await prisma.campaignSpend.deleteMany({
    where: { campaignId: LEGACY_CAMPAIGN_ID }
  });
  
  // Then delete the campaign
  await prisma.campaign.delete({
    where: { id: LEGACY_CAMPAIGN_ID }
  }).catch(e => {
    console.log('  - Old campaign already deleted or not found');
  });

  console.log('\n✅ Migration Complete!\n');
  
  // Summary
  console.log('📊 Summary:');
  console.log('─'.repeat(80));
  console.log(`${'Course'.padEnd(40)} ${'Leads'.padStart(8)} ${'Spend'.padStart(12)} Campaign ID`);
  console.log('─'.repeat(80));
  
  for (const r of results.sort((a, b) => b.leads - a.leads)) {
    console.log(`${r.course.substring(0, 38).padEnd(40)} ${r.leads.toString().padStart(8)} €${r.spend.toFixed(2).padStart(10)} ${r.campaignId}`);
  }
  
  console.log('─'.repeat(80));
  console.log(`${'TOTAL'.padEnd(40)} ${totalLeads.toString().padStart(8)} €${TOTAL_LEGACY_SPEND.toFixed(2).padStart(10)}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
