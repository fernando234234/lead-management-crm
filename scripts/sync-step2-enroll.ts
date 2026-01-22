import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function syncEnrollments() {
  console.log('=== STEP 2: ENROLLING FROM CONTRACTS CSV ===\n');
  
  // Load the cleaned CSV
  const csvContent = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log('Total rows in CSV:', records.length);
  
  const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Build unique name+course combinations from CSV (excluding test users)
  const enrollments = new Map<string, { name: string; course: string; commerciale: string }>();
  let skipped = 0;
  
  for (const row of records) {
    const name = normalize(row['Studente']);
    
    // Skip test users
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) {
      skipped++;
      continue;
    }
    
    const course = row['Corso'];
    const key = `${name}|${normalize(course)}`;
    
    if (!enrollments.has(key)) {
      enrollments.set(key, {
        name: row['Studente'].trim(),
        course,
        commerciale: row['Commerciale'] || ''
      });
    }
  }
  
  console.log(`Unique name+course to enroll: ${enrollments.size}`);
  console.log(`Skipped test users: ${skipped}`);
  
  // Get all leads with courses
  const allLeads = await prisma.lead.findMany({
    include: { course: true }
  });
  console.log(`Total leads in DB: ${allLeads.length}`);
  
  // Build index by normalized name+course
  const leadsByNameCourse = new Map<string, typeof allLeads[0]>();
  const leadsByName = new Map<string, typeof allLeads>();
  
  for (const lead of allLeads) {
    const n = normalize(lead.name);
    const c = normalize(lead.course?.name || '');
    const key = `${n}|${c}`;
    
    // Prefer first match by name+course
    if (!leadsByNameCourse.has(key)) {
      leadsByNameCourse.set(key, lead);
    }
    
    // Also index by name only
    if (!leadsByName.has(n)) leadsByName.set(n, []);
    leadsByName.get(n)!.push(lead);
  }
  
  // Get courses and users for creating new leads
  const courses = await prisma.course.findMany();
  const courseMap = new Map(courses.map(c => [normalize(c.name), c]));
  
  const users = await prisma.user.findMany();
  const userMap = new Map<string, typeof users[0]>();
  for (const u of users) {
    userMap.set(normalize(u.name), u);
    const firstName = u.name.split(' ')[0].toLowerCase();
    if (!userMap.has(firstName)) userMap.set(firstName, u);
  }
  
  // Default user for when commerciale not found
  const defaultUser = users.find(u => u.name.toLowerCase().includes('simone')) || users[0];
  
  // Process enrollments in batches
  let enrolled = 0;
  let created = 0;
  let notFound: string[] = [];
  
  const entries = Array.from(enrollments.entries());
  const batchSize = 50;
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    
    for (const [key, student] of batch) {
      const normName = normalize(student.name);
      const normCourse = normalize(student.course);
      const price = coursePrices[normCourse] || 577;
      
      // Try to find lead by exact name+course match
      let lead = leadsByNameCourse.get(key);
      
      // If not found, try to find any lead with same name that has a matching course
      if (!lead) {
        const nameLeads = leadsByName.get(normName) || [];
        lead = nameLeads.find(l => normalize(l.course?.name || '') === normCourse);
        
        // If still not found, take any lead with same name (will update their course)
        if (!lead && nameLeads.length > 0) {
          lead = nameLeads[0];
        }
      }
      
      if (lead) {
        // Update existing lead
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
        // Need to create new lead
        const courseRecord = courseMap.get(normCourse);
        if (!courseRecord) {
          notFound.push(`${student.name} | ${student.course} (course not found)`);
          continue;
        }
        
        // Find commerciale
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
    
    console.log(`Processed ${Math.min(i + batchSize, entries.length)}/${entries.length}`);
  }
  
  console.log(`\n=== RESULTS ===`);
  console.log(`Enrolled existing leads: ${enrolled}`);
  console.log(`Created new leads: ${created}`);
  console.log(`Not found/created: ${notFound.length}`);
  
  if (notFound.length > 0) {
    console.log('\nNot found:');
    notFound.forEach(s => console.log(`  ${s}`));
  }
  
  // Final verification
  const finalStats = await prisma.lead.groupBy({
    by: ['status'],
    _count: true
  });
  
  console.log('\n=== FINAL STATUS DISTRIBUTION ===');
  finalStats.forEach(s => console.log(`  ${s.status}: ${s._count}`));
  
  const totalRevenue = await prisma.lead.aggregate({
    _sum: { revenue: true }
  });
  console.log(`\nTotal revenue: €${totalRevenue._sum.revenue}`);
  
  await prisma.$disconnect();
}

syncEnrollments().catch(console.error);
