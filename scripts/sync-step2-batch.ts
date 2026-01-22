import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Course prices
const coursePrices: Record<string, number> = {
  'masterclass graphic web design': 2377,
  'masterclass ai': 577,
  'masterclass in game design': 2377,
  'masterclass architectural design': 2377,
  'masterclass full developer': 2377,
  'masterclass web developer full stack': 2377,
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
  'user interface': 577,
  'user experience': 577,
  'web design': 577,
  'attività individuale': 600,
  'excel': 377,
  'illustrazione digitale': 577,
  'digital publishing': 577,
  'logo design': 577,
  'photoshop': 577,
  'zbrush': 577,
  'game design': 577,
  'concept art': 577,
  'digital marketing': 577,
  'typography': 377,
  'project management professional': 2200,
};

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

// Get arguments: start index, batch size
const startIndex = parseInt(process.argv[2] || '0');
const batchSize = parseInt(process.argv[3] || '100');

async function syncBatch() {
  console.log(`=== BATCH ENROLLMENT: Starting at ${startIndex}, batch size ${batchSize} ===\n`);
  
  // Load the cleaned CSV
  const csvContent = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  // Build unique name+course combinations from CSV (excluding test users)
  const enrollments: { name: string; course: string; commerciale: string }[] = [];
  const seen = new Set<string>();
  
  for (const row of records) {
    const name = normalize(row['Studente']);
    
    // Skip test users
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) continue;
    
    const course = row['Corso'];
    const key = `${name}|${normalize(course)}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      enrollments.push({
        name: row['Studente'].trim(),
        course,
        commerciale: row['Commerciale'] || ''
      });
    }
  }
  
  console.log(`Total unique enrollments: ${enrollments.length}`);
  
  // Get batch
  const batch = enrollments.slice(startIndex, startIndex + batchSize);
  console.log(`Processing batch: ${startIndex} to ${startIndex + batch.length}`);
  
  if (batch.length === 0) {
    console.log('No more records to process!');
    await prisma.$disconnect();
    return;
  }
  
  // Get all leads with courses (only need this once)
  const allLeads = await prisma.lead.findMany({
    include: { course: true }
  });
  
  // Build indices
  const leadsByName = new Map<string, typeof allLeads>();
  for (const lead of allLeads) {
    const n = normalize(lead.name);
    if (!leadsByName.has(n)) leadsByName.set(n, []);
    leadsByName.get(n)!.push(lead);
  }
  
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
  
  // Process batch
  let enrolled = 0;
  let created = 0;
  let notFound: string[] = [];
  
  for (const student of batch) {
    const normName = normalize(student.name);
    const normCourse = normalize(student.course);
    const price = coursePrices[normCourse] || 577;
    
    const nameLeads = leadsByName.get(normName) || [];
    
    // Find lead with matching course, or any lead with same name
    let lead = nameLeads.find(l => normalize(l.course?.name || '') === normCourse);
    if (!lead && nameLeads.length > 0) {
      lead = nameLeads[0];
    }
    
    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'ISCRITTO',
          enrolled: true,
          revenue: price
        }
      });
      enrolled++;
    } else {
      const courseRecord = courseMap.get(normCourse);
      if (!courseRecord) {
        notFound.push(`${student.name} | ${student.course}`);
        continue;
      }
      
      const commName = normalize(student.commerciale).split(' ')[0];
      const user = userMap.get(commName) || defaultUser;
      
      await prisma.lead.create({
        data: {
          name: student.name,
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
  
  console.log(`\nBatch results:`);
  console.log(`  Enrolled: ${enrolled}`);
  console.log(`  Created: ${created}`);
  console.log(`  Not found: ${notFound.length}`);
  
  if (notFound.length > 0) {
    console.log('\nNot found:');
    notFound.forEach(s => console.log(`  ${s}`));
  }
  
  // Next batch command
  const nextStart = startIndex + batchSize;
  if (nextStart < enrollments.length) {
    console.log(`\nRun next batch: npx tsx scripts/sync-step2-batch.ts ${nextStart} ${batchSize}`);
  } else {
    console.log('\n=== ALL BATCHES COMPLETE ===');
    
    // Final stats
    const finalStats = await prisma.lead.groupBy({
      by: ['status'],
      _count: true
    });
    console.log('\nFinal status distribution:');
    finalStats.forEach(s => console.log(`  ${s.status}: ${s._count}`));
  }
  
  await prisma.$disconnect();
}

syncBatch().catch(console.error);
