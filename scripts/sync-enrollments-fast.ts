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
  console.log('=== SYNCING ENROLLMENTS WITH NEW CONTRACTS CSV ===\n');
  
  // Load the NEW cleaned CSV (source of truth)
  const csvContent = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log('Total rows in contracts CSV:', records.length);
  
  // Normalize name for matching
  const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Build set of contracted students
  const contractedStudents: { name: string; course: string; commerciale: string }[] = [];
  
  for (const row of records) {
    const name = normalize(row['Studente']);
    
    // Skip Manuel Alvaro and Benedetta Barbarisi
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) {
      continue;
    }
    
    contractedStudents.push({
      name: row['Studente'].trim(),
      course: row['Corso'],
      commerciale: row['Commerciale']
    });
  }
  
  console.log('Students to enroll (excluding test users):', contractedStudents.length);
  
  // Get all leads with courses
  const allLeads = await prisma.lead.findMany({
    include: { course: true }
  });
  console.log('Total leads in DB:', allLeads.length);
  
  // Build index by normalized name
  const leadsByName = new Map<string, typeof allLeads>();
  for (const lead of allLeads) {
    const n = normalize(lead.name);
    if (!leadsByName.has(n)) leadsByName.set(n, []);
    leadsByName.get(n)!.push(lead);
  }
  
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
  
  // Step 1: Reset ALL leads to not enrolled
  console.log('\n--- Step 1: Resetting all enrollments ---');
  await prisma.lead.updateMany({
    data: {
      status: 'NUOVO',
      enrolled: false,
      revenue: 0
    }
  });
  console.log('Reset all leads');
  
  // Step 2: Mark contracted students as enrolled
  console.log('\n--- Step 2: Enrolling contracted students ---');
  
  const toEnroll: string[] = [];
  const notFound: string[] = [];
  const toCreate: { name: string; courseId: string; userId: string; price: number }[] = [];
  
  for (const student of contractedStudents) {
    const normName = normalize(student.name);
    const normCourse = normalize(student.course);
    const leads = leadsByName.get(normName) || [];
    
    // Find lead with matching course
    let lead = leads.find(l => normalize(l.course?.name || '') === normCourse);
    
    // If not found, try any lead with same name
    if (!lead && leads.length > 0) {
      lead = leads[0];
    }
    
    if (lead) {
      toEnroll.push(lead.id);
    } else {
      // Need to create
      const courseRecord = courseMap.get(normCourse);
      const commName = normalize(student.commerciale).split(' ')[0];
      const user = userMap.get(commName) || userMap.get('simone');
      
      if (courseRecord && user) {
        toCreate.push({
          name: student.name,
          courseId: courseRecord.id,
          userId: user.id,
          price: coursePrices[normCourse] || 577
        });
      } else {
        notFound.push(`${student.name} | ${student.course}`);
      }
    }
  }
  
  console.log(`Leads to enroll: ${toEnroll.length}`);
  console.log(`Leads to create: ${toCreate.length}`);
  console.log(`Not found: ${notFound.length}`);
  
  // Batch update enrolled leads - only ONE lead per name+course combination
  const enrolledCombos = new Set<string>();
  
  if (toEnroll.length > 0) {
    for (const student of contractedStudents) {
      const normName = normalize(student.name);
      const normCourse = normalize(student.course);
      const comboKey = `${normName}|${normCourse}`;
      
      // Skip if we already enrolled this name+course combination
      if (enrolledCombos.has(comboKey)) continue;
      
      const price = coursePrices[normCourse] || 577;
      const leads = leadsByName.get(normName) || [];
      
      // Find lead with matching course, or any lead with that name
      let lead = leads.find(l => normalize(l.course?.name || '') === normCourse && toEnroll.includes(l.id));
      if (!lead) {
        lead = leads.find(l => toEnroll.includes(l.id));
      }
      
      if (lead && toEnroll.includes(lead.id)) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'ISCRITTO',
            enrolled: true,
            revenue: price
          }
        });
        enrolledCombos.add(comboKey);
        // Remove this lead from toEnroll so we don't enroll it again
        const idx = toEnroll.indexOf(lead.id);
        if (idx > -1) toEnroll.splice(idx, 1);
      }
    }
  }
  
  console.log(`Enrolled combinations: ${enrolledCombos.size}`);
  
  // Create new leads
  for (const item of toCreate) {
    await prisma.lead.create({
      data: {
        name: item.name,
        courseId: item.courseId,
        assignedToId: item.userId,
        status: 'ISCRITTO',
        enrolled: true,
        revenue: item.price,
        source: 'MANUAL'
      }
    });
  }
  
  if (notFound.length > 0) {
    console.log('\nNot found (missing course in DB):');
    notFound.forEach(s => console.log(`  ${s}`));
  }
  
  // Final stats
  const finalEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const finalRevenue = await prisma.lead.aggregate({ _sum: { revenue: true } });
  
  console.log('\n=== FINAL STATE ===');
  console.log(`Total enrolled: ${finalEnrolled}`);
  console.log(`Total revenue: €${finalRevenue._sum.revenue}`);
  
  await prisma.$disconnect();
}

syncEnrollments().catch(console.error);
