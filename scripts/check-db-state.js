/**
 * Check current database state and compare with import data
 */

const { PrismaClient } = require('@prisma/client');
const importData = require('./import-leads.json');

const prisma = new PrismaClient();

async function checkDBState() {
  console.log('=== DATABASE STATE CHECK ===\n');

  // 1. Get all commercials
  console.log('--- COMMERCIALS (Users with COMMERCIAL role) ---');
  const commercials = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true, username: true }
  });
  
  commercials.forEach(c => {
    console.log(`  - ${c.name} (username: ${c.username})`);
  });
  
  const commercialNames = new Set(commercials.map(c => c.name.toLowerCase().trim()));
  const commercialUsernames = new Set(commercials.map(c => c.username.toLowerCase().trim()));

  // 2. Get all courses
  console.log('\n--- COURSES ---');
  const courses = await prisma.course.findMany({
    select: { id: true, name: true, active: true }
  });
  
  courses.forEach(c => {
    console.log(`  - ${c.name} ${c.active ? '' : '(INACTIVE)'}`);
  });
  
  const courseNames = new Set(courses.map(c => c.name.toLowerCase().trim()));

  // 3. Check import data against DB
  console.log('\n=== IMPORT DATA ANALYSIS ===\n');
  console.log(`Total leads to import: ${importData.leads.length}`);

  // Commercial analysis
  console.log('\n--- COMMERCIAL MATCHING ---');
  const importCommercials = new Map();
  importData.leads.forEach(lead => {
    const name = lead.assignedToName || '(none)';
    importCommercials.set(name, (importCommercials.get(name) || 0) + 1);
  });

  let unmatchedCommercials = [];
  importCommercials.forEach((count, name) => {
    if (name === '(none)') {
      console.log(`  ⚠️  ${name}: ${count} leads (will be unassigned)`);
      return;
    }
    
    const nameLower = name.toLowerCase().trim();
    const matched = commercialNames.has(nameLower) || commercialUsernames.has(nameLower);
    
    if (matched) {
      console.log(`  ✅ ${name}: ${count} leads`);
    } else {
      console.log(`  ❌ ${name}: ${count} leads - NOT FOUND IN DB`);
      unmatchedCommercials.push(name);
    }
  });

  // Course analysis
  console.log('\n--- COURSE MATCHING ---');
  const importCourses = new Map();
  importData.leads.forEach(lead => {
    const name = lead.courseName || '(none)';
    importCourses.set(name, (importCourses.get(name) || 0) + 1);
  });

  let newCourses = [];
  let matchedCourses = [];
  importCourses.forEach((count, name) => {
    if (name === '(none)') {
      console.log(`  ⚠️  ${name}: ${count} leads (will use default course)`);
      return;
    }
    
    const nameLower = name.toLowerCase().trim();
    const matched = courseNames.has(nameLower);
    
    // Also check partial matches
    let partialMatch = null;
    if (!matched) {
      for (const existingCourse of courseNames) {
        if (existingCourse.includes(nameLower) || nameLower.includes(existingCourse)) {
          partialMatch = existingCourse;
          break;
        }
      }
    }
    
    if (matched) {
      console.log(`  ✅ ${name}: ${count} leads`);
      matchedCourses.push(name);
    } else if (partialMatch) {
      console.log(`  🔶 ${name}: ${count} leads - PARTIAL MATCH with "${partialMatch}"`);
      matchedCourses.push(name);
    } else {
      console.log(`  🆕 ${name}: ${count} leads - WILL BE CREATED`);
      newCourses.push(name);
    }
  });

  // Lead name analysis (check for duplicates)
  console.log('\n--- POTENTIAL DUPLICATE CHECK ---');
  const existingLeads = await prisma.lead.findMany({
    select: { name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500
  });
  
  const existingNames = new Set(existingLeads.map(l => l.name.toLowerCase().trim()));
  
  const potentialDuplicates = importData.leads.filter(lead => 
    existingNames.has(lead.name.toLowerCase().trim())
  );
  
  if (potentialDuplicates.length > 0) {
    console.log(`  ⚠️  ${potentialDuplicates.length} leads have names matching existing records:`);
    potentialDuplicates.slice(0, 10).forEach(lead => {
      console.log(`     - ${lead.name}`);
    });
    if (potentialDuplicates.length > 10) {
      console.log(`     ... and ${potentialDuplicates.length - 10} more`);
    }
  } else {
    console.log('  ✅ No potential duplicates found');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Leads to import: ${importData.leads.length}`);
  console.log(`Unmatched commercials: ${unmatchedCommercials.length > 0 ? unmatchedCommercials.join(', ') : 'None'}`);
  console.log(`New courses to create: ${newCourses.length > 0 ? newCourses.length : 'None'}`);
  if (newCourses.length > 0) {
    newCourses.forEach(c => console.log(`  - ${c}`));
  }
  console.log(`Potential duplicates: ${potentialDuplicates.length}`);

  await prisma.$disconnect();
}

checkDBState().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
