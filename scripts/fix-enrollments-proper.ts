import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const coursePrices: Record<string, number> = {
  'masterclass graphic web design': 2377,
  'masterclass ai': 577,
  'masterclass in game design': 2377,
  'masterclass architectural design': 2377,
  'masterclass full developer': 2377,
  'graphic design': 777,
  'blender / 3d': 577,
  'social media manager': 577,
  'revit': 577,
  'autocad': 577,
  'catia': 577,
  'interior planner': 577,
  'brand communication': 577,
  'narrative design': 577,
  'character design': 577,
  'motion design': 577,
  'ux/ui design': 577,
  'excel': 377,
  'illustrazione digitale': 577,
  'digital publishing': 577,
  'logo design': 577,
  'photoshop': 577,
  'zbrush': 577,
  'game design': 577,
  'concept art': 577,
  'digital marketing': 577,
  'project management professional': 2200,
};

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

async function run() {
  console.log('=== FIXING ENROLLMENTS PROPERLY ===\n');
  
  // Step 1: Reset ALL ISCRITTO to CONTATTATO
  console.log('Step 1: Resetting all ISCRITTO to CONTATTATO...');
  const resetResult = await prisma.lead.updateMany({
    where: { status: 'ISCRITTO' },
    data: { status: 'CONTATTATO', enrolled: false, revenue: 0 }
  });
  console.log(`Reset ${resetResult.count} leads\n`);
  
  // Step 2: Load CSV and build unique enrollments
  console.log('Step 2: Loading CSV...');
  const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true, 
    relax_column_count: true 
  });
  
  const enrollments = new Map<string, { name: string; course: string; commerciale: string }>();
  for (const row of data) {
    const name = normalize(row['Studente']);
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) continue;
    const course = normalize(row['Corso']);
    const key = `${name}|${course}`;
    if (!enrollments.has(key)) {
      enrollments.set(key, {
        name: row['Studente'].trim(),
        course: row['Corso'],
        commerciale: row['Commerciale'] || ''
      });
    }
  }
  console.log(`Unique enrollments to process: ${enrollments.size}\n`);
  
  // Step 3: Get all leads indexed by name+course
  console.log('Step 3: Loading all leads...');
  const allLeads = await prisma.lead.findMany({ include: { course: true } });
  
  const leadsByNameCourse = new Map<string, typeof allLeads[0]>();
  for (const lead of allLeads) {
    const key = `${normalize(lead.name)}|${normalize(lead.course?.name || '')}`;
    if (!leadsByNameCourse.has(key)) {
      leadsByNameCourse.set(key, lead);
    }
  }
  console.log(`Total leads: ${allLeads.length}\n`);
  
  // Step 4: Get courses
  const courses = await prisma.course.findMany();
  const courseMap = new Map(courses.map(c => [normalize(c.name), c]));
  
  // Step 5: Get users for assignment
  const users = await prisma.user.findMany();
  const userMap = new Map<string, typeof users[0]>();
  for (const u of users) {
    userMap.set(normalize(u.name), u);
    const firstName = u.name.split(' ')[0].toLowerCase();
    if (!userMap.has(firstName)) userMap.set(firstName, u);
  }
  const defaultUser = users.find(u => u.name.toLowerCase().includes('simone')) || users[0];
  
  // Step 6: Process each enrollment
  console.log('Step 4: Processing enrollments...');
  let enrolled = 0;
  let created = 0;
  let courseNotFound: string[] = [];
  
  for (const [key, enrollment] of enrollments) {
    const normName = normalize(enrollment.name);
    const normCourse = normalize(enrollment.course);
    const price = coursePrices[normCourse] || 577;
    
    // Try to find existing lead with exact name+course
    const existingLead = leadsByNameCourse.get(key);
    
    if (existingLead) {
      // Update existing lead
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: { status: 'ISCRITTO', enrolled: true, revenue: price }
      });
      enrolled++;
    } else {
      // Need to create new lead - find the course first
      const courseRecord = courseMap.get(normCourse);
      if (!courseRecord) {
        courseNotFound.push(`${enrollment.name} | ${enrollment.course}`);
        continue;
      }
      
      // Find commerciale
      const commName = normalize(enrollment.commerciale).split(' ')[0];
      const user = userMap.get(commName) || defaultUser;
      
      // Create new lead
      await prisma.lead.create({
        data: {
          name: enrollment.name,
          courseId: courseRecord.id,
          assignedToId: user.id,
          status: 'ISCRITTO',
          enrolled: true,
          revenue: price,
          source: 'MANUAL'
        }
      });
      created++;
    }
  }
  
  console.log(`\n=== RESULTS ===`);
  console.log(`Enrolled existing leads: ${enrolled}`);
  console.log(`Created new leads: ${created}`);
  console.log(`Total enrolled: ${enrolled + created}`);
  
  if (courseNotFound.length > 0) {
    console.log(`\nCourse not found (${courseNotFound.length}):`);
    courseNotFound.forEach(c => console.log(`  ${c}`));
  }
  
  // Verify
  const finalCount = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const finalStats = await prisma.lead.groupBy({ by: ['status'], _count: true });
  
  console.log(`\n=== FINAL STATUS ===`);
  finalStats.forEach(s => console.log(`  ${s.status}: ${s._count}`));
  console.log(`\nExpected enrolled: 485`);
  console.log(`Actual enrolled: ${finalCount}`);
  
  await prisma.$disconnect();
}

run().catch(console.error);
