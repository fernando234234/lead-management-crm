/**
 * Detailed duplicate analysis - check if leads with same names already exist
 * with same course/commercial assignment
 */

const { PrismaClient } = require('@prisma/client');
const importData = require('./import-leads.json');

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('=== DETAILED DUPLICATE ANALYSIS ===\n');

  // Get all existing leads with their details
  const existingLeads = await prisma.lead.findMany({
    select: { 
      name: true, 
      createdAt: true,
      course: { select: { name: true } },
      assignedTo: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Create a map of existing leads by name (lowercase)
  const existingByName = new Map();
  existingLeads.forEach(lead => {
    const key = lead.name.toLowerCase().trim();
    if (!existingByName.has(key)) {
      existingByName.set(key, []);
    }
    existingByName.get(key).push(lead);
  });

  console.log(`Total existing leads in DB: ${existingLeads.length}`);
  console.log(`Import leads to check: ${importData.leads.length}\n`);

  let exactDuplicates = [];
  let sameName = [];
  let newLeads = [];

  for (const importLead of importData.leads) {
    const key = importLead.name.toLowerCase().trim();
    const existing = existingByName.get(key);

    if (!existing || existing.length === 0) {
      newLeads.push(importLead);
      continue;
    }

    // Check if it's an exact duplicate (same name + same course + same commercial)
    const exactMatch = existing.find(e => {
      const sameCommercial = e.assignedTo?.name?.toLowerCase() === importLead.assignedToName?.toLowerCase();
      const sameCourse = e.course?.name?.toLowerCase().includes(importLead.courseName?.toLowerCase() || '') ||
                        (importLead.courseName?.toLowerCase() || '').includes(e.course?.name?.toLowerCase() || '');
      return sameCommercial && sameCourse;
    });

    if (exactMatch) {
      exactDuplicates.push({
        import: importLead,
        existing: exactMatch
      });
    } else {
      sameName.push({
        import: importLead,
        existing: existing[0]
      });
    }
  }

  console.log('--- RESULTS ---\n');
  
  console.log(`✅ NEW LEADS (no name match): ${newLeads.length}`);
  newLeads.forEach(l => {
    console.log(`   - ${l.name} | ${l.courseName} | ${l.assignedToName}`);
  });

  console.log(`\n⚠️  SAME NAME, DIFFERENT DETAILS: ${sameName.length}`);
  if (sameName.length > 0) {
    console.log('   These have the same name but different course/commercial - might be same person with new inquiry:\n');
    sameName.slice(0, 15).forEach(({ import: imp, existing: ex }) => {
      console.log(`   "${imp.name}"`);
      console.log(`      IMPORT:   ${imp.courseName || 'N/A'} | ${imp.assignedToName || 'N/A'}`);
      console.log(`      EXISTING: ${ex.course?.name || 'N/A'} | ${ex.assignedTo?.name || 'N/A'} | ${ex.createdAt.toISOString().split('T')[0]}`);
    });
    if (sameName.length > 15) {
      console.log(`   ... and ${sameName.length - 15} more`);
    }
  }

  console.log(`\n❌ EXACT DUPLICATES (same name + course + commercial): ${exactDuplicates.length}`);
  if (exactDuplicates.length > 0) {
    console.log('   These appear to be true duplicates and should probably be skipped:\n');
    exactDuplicates.slice(0, 15).forEach(({ import: imp, existing: ex }) => {
      console.log(`   - "${imp.name}" | ${imp.courseName} | ${imp.assignedToName} | existed: ${ex.createdAt.toISOString().split('T')[0]}`);
    });
    if (exactDuplicates.length > 15) {
      console.log(`   ... and ${exactDuplicates.length - 15} more`);
    }
  }

  console.log('\n=== RECOMMENDATION ===');
  console.log(`Safe to import (new + same name different details): ${newLeads.length + sameName.length} leads`);
  console.log(`Should skip (exact duplicates): ${exactDuplicates.length} leads`);

  await prisma.$disconnect();
  
  return { newLeads, sameName, exactDuplicates };
}

checkDuplicates().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
