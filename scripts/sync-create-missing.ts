import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const coursePrices: Record<string, number> = {
  'masterclass graphic web design': 2377,
  'masterclass ai': 577,
  'masterclass in game design': 2377,
  'masterclass architectural design': 2377,
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
  // Load CSV
  const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true, 
    relax_column_count: true 
  });
  
  // Get unique enrollments from CSV
  const csvEnrollments = new Map<string, { name: string; course: string; commerciale: string }>();
  for (const row of data) {
    const name = normalize(row['Studente']);
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) continue;
    const course = normalize(row['Corso']);
    const key = `${name}|${course}`;
    if (!csvEnrollments.has(key)) {
      csvEnrollments.set(key, { 
        name: row['Studente'].trim(), 
        course: row['Corso'],
        commerciale: row['Commerciale'] || ''
      });
    }
  }
  
  console.log('CSV unique enrollments:', csvEnrollments.size);
  
  // Get ALL DB leads (not just enrolled)
  const allLeads = await prisma.lead.findMany({ include: { course: true } });
  
  // Build index by name+course
  const dbByNameCourse = new Set(allLeads.map(l => `${normalize(l.name)}|${normalize(l.course?.name || '')}`));
  
  // Get courses and users
  const courses = await prisma.course.findMany();
  const courseMap = new Map(courses.map(c => [normalize(c.name), c]));
  
  const users = await prisma.user.findMany();
  const userMap = new Map<string, typeof users[0]>();
  for (const u of users) {
    userMap.set(normalize(u.name), u);
    const firstName = u.name.split(' ')[0].toLowerCase();
    if (!userMap.has(firstName)) userMap.set(firstName, u);
  }
  const defaultUser = users.find(u => u.name.toLowerCase().includes('simone')) || users[0];
  
  // Find missing (not in DB at all for this name+course)
  const toCreate: { name: string; course: string; commerciale: string }[] = [];
  const toUpdate: { id: string; price: number }[] = [];
  
  for (const [key, val] of csvEnrollments) {
    if (!dbByNameCourse.has(key)) {
      // Need to create new lead for this name+course
      toCreate.push(val);
    } else {
      // Lead exists - find and mark as enrolled if not already
      const lead = allLeads.find(l => 
        normalize(l.name) === normalize(val.name) && 
        normalize(l.course?.name || '') === normalize(val.course)
      );
      if (lead && lead.status !== 'ISCRITTO') {
        toUpdate.push({ id: lead.id, price: coursePrices[normalize(val.course)] || 577 });
      }
    }
  }
  
  console.log('Need to create:', toCreate.length);
  console.log('Need to update (already exist but not enrolled):', toUpdate.length);
  
  // Process batch of 10
  const batchCreate = toCreate.slice(0, 10);
  const batchUpdate = toUpdate.slice(0, 10);
  
  let created = 0;
  let updated = 0;
  const notFound: string[] = [];
  
  for (const item of batchCreate) {
    const courseRec = courseMap.get(normalize(item.course));
    if (!courseRec) {
      notFound.push(`${item.name} | ${item.course} (course not in DB)`);
      continue;
    }
    
    const commName = normalize(item.commerciale).split(' ')[0];
    const user = userMap.get(commName) || defaultUser;
    const price = coursePrices[normalize(item.course)] || 577;
    
    await prisma.lead.create({
      data: {
        name: item.name,
        courseId: courseRec.id,
        assignedToId: user.id,
        status: 'ISCRITTO',
        enrolled: true,
        revenue: price,
        source: 'MANUAL'
      }
    });
    created++;
  }
  
  for (const item of batchUpdate) {
    await prisma.lead.update({
      where: { id: item.id },
      data: { status: 'ISCRITTO', enrolled: true, revenue: item.price }
    });
    updated++;
  }
  
  console.log(`\nCreated: ${created}`);
  console.log(`Updated: ${updated}`);
  if (notFound.length > 0) {
    console.log('Not found:');
    notFound.forEach(n => console.log(`  ${n}`));
  }
  
  const remaining = (toCreate.length - batchCreate.length) + (toUpdate.length - batchUpdate.length);
  if (remaining > 0) {
    console.log(`\nRemaining: ${remaining} - run again to continue`);
  } else {
    console.log('\n=== ALL DONE ===');
    const finalCount = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
    console.log(`Final enrolled count: ${finalCount}`);
  }
  
  await prisma.$disconnect();
}

run().catch(console.error);
