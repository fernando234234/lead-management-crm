/**
 * Full report of all leads to import with existing matches
 */

const { PrismaClient } = require('@prisma/client');
const importData = require('./import-leads.json');

const prisma = new PrismaClient();

async function generateReport() {
  // Get all existing leads
  const existingLeads = await prisma.lead.findMany({
    select: { 
      id: true,
      name: true, 
      createdAt: true,
      status: true,
      contacted: true,
      enrolled: true,
      course: { select: { name: true } },
      assignedTo: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Create a map by name
  const existingByName = new Map();
  existingLeads.forEach(lead => {
    const key = lead.name.toLowerCase().trim();
    if (!existingByName.has(key)) {
      existingByName.set(key, []);
    }
    existingByName.get(key).push(lead);
  });

  console.log('============================================================');
  console.log('            COMPLETE LEAD IMPORT REVIEW');
  console.log('============================================================\n');

  let counter = 0;
  const categories = {
    new: [],
    exactDupe: [],
    sameNameDiffCommercial: [],
    sameNameUnassigned: [],
    sameNameDiffCourse: []
  };

  for (const lead of importData.leads) {
    counter++;
    const key = lead.name.toLowerCase().trim();
    const existing = existingByName.get(key) || [];

    let category = 'new';
    let matchDetails = null;

    if (existing.length > 0) {
      // Find best match
      for (const ex of existing) {
        const exCommercial = ex.assignedTo?.name?.toLowerCase() || '';
        const impCommercial = lead.assignedToName?.toLowerCase() || '';
        const exCourse = ex.course?.name?.toLowerCase() || '';
        const impCourse = lead.courseName?.toLowerCase() || '';
        
        const sameCommercial = exCommercial === impCommercial;
        const sameCourse = exCourse.includes(impCourse) || impCourse.includes(exCourse);

        if (sameCommercial && sameCourse) {
          category = 'exactDupe';
          matchDetails = ex;
          break;
        } else if (!exCommercial && sameCourse) {
          category = 'sameNameUnassigned';
          matchDetails = ex;
        } else if (sameCourse && !sameCommercial) {
          category = 'sameNameDiffCommercial';
          matchDetails = matchDetails || ex;
        } else {
          category = 'sameNameDiffCourse';
          matchDetails = matchDetails || ex;
        }
      }
    }

    categories[category].push({ lead, matchDetails, existing });
  }

  // Print report by category
  console.log('============================================================');
  console.log(`🆕 NEW LEADS (${categories.new.length}) - No match in DB`);
  console.log('============================================================');
  categories.new.forEach(({ lead }, i) => {
    console.log(`\n[NEW-${i+1}] ${lead.name}`);
    console.log(`   Course: ${lead.courseName || 'N/A'}`);
    console.log(`   Commercial: ${lead.assignedToName || 'N/A'}`);
    console.log(`   Status: ${lead.status}`);
    console.log(`   → RECOMMEND: IMPORT`);
  });

  console.log('\n\n============================================================');
  console.log(`❌ EXACT DUPLICATES (${categories.exactDupe.length}) - Same name + course + commercial`);
  console.log('============================================================');
  categories.exactDupe.forEach(({ lead, matchDetails }, i) => {
    console.log(`\n[DUPE-${i+1}] ${lead.name}`);
    console.log(`   IMPORT:   ${lead.courseName} | ${lead.assignedToName} | Status: ${lead.status}`);
    console.log(`   EXISTING: ${matchDetails.course?.name} | ${matchDetails.assignedTo?.name} | Status: ${matchDetails.status} | Date: ${matchDetails.createdAt.toISOString().split('T')[0]}`);
    console.log(`   → RECOMMEND: SKIP (already exists)`);
  });

  console.log('\n\n============================================================');
  console.log(`🔄 SAME NAME, UNASSIGNED IN DB (${categories.sameNameUnassigned.length}) - Could be assignment update`);
  console.log('============================================================');
  categories.sameNameUnassigned.forEach(({ lead, matchDetails }, i) => {
    console.log(`\n[UNASSIGNED-${i+1}] ${lead.name}`);
    console.log(`   IMPORT:   ${lead.courseName} | ${lead.assignedToName} | Status: ${lead.status}`);
    console.log(`   EXISTING: ${matchDetails.course?.name} | (UNASSIGNED) | Status: ${matchDetails.status} | Date: ${matchDetails.createdAt.toISOString().split('T')[0]}`);
    console.log(`   → RECOMMEND: UPDATE existing lead's assignedTo to "${lead.assignedToName}"`);
  });

  console.log('\n\n============================================================');
  console.log(`👥 SAME NAME, DIFFERENT COMMERCIAL (${categories.sameNameDiffCommercial.length}) - Reassignment or different person?`);
  console.log('============================================================');
  categories.sameNameDiffCommercial.forEach(({ lead, matchDetails }, i) => {
    console.log(`\n[DIFF-COMM-${i+1}] ${lead.name}`);
    console.log(`   IMPORT:   ${lead.courseName} | ${lead.assignedToName} | Status: ${lead.status}`);
    console.log(`   EXISTING: ${matchDetails.course?.name} | ${matchDetails.assignedTo?.name || 'N/A'} | Status: ${matchDetails.status} | Date: ${matchDetails.createdAt.toISOString().split('T')[0]}`);
    console.log(`   → RECOMMEND: Review - could be reassignment or duplicate entry`);
  });

  console.log('\n\n============================================================');
  console.log(`📚 SAME NAME, DIFFERENT COURSE (${categories.sameNameDiffCourse.length}) - Person interested in multiple courses`);
  console.log('============================================================');
  categories.sameNameDiffCourse.forEach(({ lead, matchDetails }, i) => {
    console.log(`\n[DIFF-COURSE-${i+1}] ${lead.name}`);
    console.log(`   IMPORT:   ${lead.courseName} | ${lead.assignedToName} | Status: ${lead.status}`);
    console.log(`   EXISTING: ${matchDetails.course?.name} | ${matchDetails.assignedTo?.name || 'N/A'} | Status: ${matchDetails.status} | Date: ${matchDetails.createdAt.toISOString().split('T')[0]}`);
    console.log(`   → RECOMMEND: IMPORT as new interest (different course)`);
  });

  // Summary
  console.log('\n\n============================================================');
  console.log('                    SUMMARY');
  console.log('============================================================');
  console.log(`🆕 New leads:                 ${categories.new.length}`);
  console.log(`❌ Exact duplicates (skip):   ${categories.exactDupe.length}`);
  console.log(`🔄 Unassigned (update):       ${categories.sameNameUnassigned.length}`);
  console.log(`👥 Diff commercial (review):  ${categories.sameNameDiffCommercial.length}`);
  console.log(`📚 Diff course (import):      ${categories.sameNameDiffCourse.length}`);
  console.log('------------------------------------------------------------');
  console.log(`TOTAL:                        ${importData.leads.length}`);

  await prisma.$disconnect();
}

generateReport().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
