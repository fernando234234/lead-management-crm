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
  console.log('=== CONTINUING ENROLLMENTS ===\n');
  
  // Load CSV
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
  console.log(`Total enrollments in CSV: ${enrollments.size}`);
  
  // Get already enrolled
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  const enrolledKeys = new Set(enrolled.map(l => `${normalize(l.name)}|${normalize(l.course?.name || '')}`));
  console.log(`Already enrolled: ${enrolled.length}`);
  
  // Find what's still missing
  const missing: { name: string; course: string; commerciale: string }[] = [];
  for (const [key, val] of enrollments) {
    if (!enrolledKeys.has(key)) {
      missing.push(val);
    }
  }
  console.log(`Still need to enroll: ${missing.length}`);
  
  if (missing.length === 0) {
    console.log('\n=== ALL DONE! ===');
    await prisma.$disconnect();
    return;
  }
  
  // Get all leads indexed by name+course
  const allLeads = await prisma.lead.findMany({ include: { course: true } });
  const leadsByNameCourse = new Map<string, typeof allLeads[0]>();
  for (const lead of allLeads) {
    const key = `${normalize(lead.name)}|${normalize(lead.course?.name || '')}`;
    if (!leadsByNameCourse.has(key)) {
      leadsByNameCourse.set(key, lead);
    }
  }
  
  // Get courses
  const courses = await prisma.course.findMany();
  const courseMap = new Map(courses.map(c => [normalize(c.name), c]));
  
  // Get users
  const users = await prisma.user.findMany();
  const userMap = new Map<string, typeof users[0]>();
  for (const u of users) {
    userMap.set(normalize(u.name), u);
    const firstName = u.name.split(' ')[0].toLowerCase();
    if (!userMap.has(firstName)) userMap.set(firstName, u);
  }
  const defaultUser = users.find(u => u.name.toLowerCase().includes('simone')) || users[0];
  
  // Process batch of 30
  const batch = missing.slice(0, 30);
  let updated = 0;
  let created = 0;
  let notFound: string[] = [];
  
  for (const enrollment of batch) {
    const normName = normalize(enrollment.name);
    const normCourse = normalize(enrollment.course);
    const key = `${normName}|${normCourse}`;
    const price = coursePrices[normCourse] || 577;
    
    const existingLead = leadsByNameCourse.get(key);
    
    if (existingLead) {
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: { status: 'ISCRITTO', enrolled: true, revenue: price }
      });
      updated++;
    } else {
      const courseRecord = courseMap.get(normCourse);
      if (!courseRecord) {
        notFound.push(`${enrollment.name} | ${enrollment.course}`);
        continue;
      }
      
      const commName = normalize(enrollment.commerciale).split(' ')[0];
      const user = userMap.get(commName) || defaultUser;
      
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
  
  console.log(`\nBatch results: updated ${updated}, created ${created}`);
  if (notFound.length > 0) {
    console.log('Course not found:');
    notFound.forEach(n => console.log(`  ${n}`));
  }
  
  const remaining = missing.length - batch.length;
  if (remaining > 0) {
    console.log(`\nRemaining: ${remaining} - run again`);
  } else {
    console.log('\n=== ALL DONE! ===');
  }
  
  const finalCount = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  console.log(`Current enrolled: ${finalCount} / 485`);
  
  await prisma.$disconnect();
}

run().catch(console.error);
