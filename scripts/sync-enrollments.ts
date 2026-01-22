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
  
  // Build set of contracted students (name + course)
  const contractedStudents = new Map<string, { name: string; course: string; commerciale: string }>();
  
  for (const row of records) {
    const name = normalize(row['Studente']);
    const course = normalize(row['Corso']);
    const key = `${name}|${course}`;
    
    // Skip Manuel Alvaro and Benedetta Barbarisi
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) {
      continue;
    }
    
    contractedStudents.set(key, {
      name: row['Studente'],
      course: row['Corso'],
      commerciale: row['Commerciale']
    });
  }
  
  console.log('Unique student+course combinations (excluding test users):', contractedStudents.size);
  
  // Step 1: Un-enroll ALL currently enrolled
  console.log('\n--- Step 1: Resetting all enrollments ---');
  const resetResult = await prisma.lead.updateMany({
    where: { status: 'ISCRITTO' },
    data: {
      status: 'CONTATTATO',
      enrolled: false,
      revenue: 0
    }
  });
  console.log(`Reset ${resetResult.count} leads to CONTATTATO`);
  
  // Step 2: For each contracted student, find and enroll them
  console.log('\n--- Step 2: Enrolling contracted students ---');
  
  let enrolled = 0;
  let notFound = 0;
  let created = 0;
  const notFoundList: string[] = [];
  
  // Get all courses and users
  const courses = await prisma.course.findMany();
  const courseMap = new Map(courses.map(c => [normalize(c.name), c]));
  
  const users = await prisma.user.findMany();
  const userMap = new Map<string, typeof users[0]>();
  for (const u of users) {
    userMap.set(normalize(u.name), u);
    // Also map by first name
    const firstName = u.name.split(' ')[0].toLowerCase();
    if (!userMap.has(firstName)) userMap.set(firstName, u);
  }
  
  for (const [key, student] of contractedStudents) {
    const normName = normalize(student.name);
    const normCourse = normalize(student.course);
    
    // Find lead by name and course
    const lead = await prisma.lead.findFirst({
      where: {
        name: { equals: student.name, mode: 'insensitive' },
        course: { name: { equals: student.course, mode: 'insensitive' } }
      }
    });
    
    if (lead) {
      // Enroll existing lead
      const price = coursePrices[normCourse] || 577;
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
      // Try to find by name only (might be different course in DB)
      const leadByName = await prisma.lead.findFirst({
        where: { name: { equals: student.name, mode: 'insensitive' } },
        include: { course: true }
      });
      
      if (leadByName) {
        // Update the course and enroll
        const courseRecord = courseMap.get(normCourse);
        if (courseRecord) {
          const price = coursePrices[normCourse] || 577;
          await prisma.lead.update({
            where: { id: leadByName.id },
            data: {
              courseId: courseRecord.id,
              status: 'ISCRITTO',
              enrolled: true,
              revenue: price
            }
          });
          enrolled++;
        } else {
          notFoundList.push(`${student.name} | ${student.course} (course not found)`);
          notFound++;
        }
      } else {
        // Create new lead
        const courseRecord = courseMap.get(normCourse);
        const commName = normalize(student.commerciale).split(' ')[0];
        const user = userMap.get(commName) || userMap.get('simone');
        
        if (courseRecord && user) {
          const price = coursePrices[normCourse] || 577;
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
          enrolled++;
        } else {
          notFoundList.push(`${student.name} | ${student.course} (could not create)`);
          notFound++;
        }
      }
    }
  }
  
  console.log(`Enrolled: ${enrolled}`);
  console.log(`Created new: ${created}`);
  console.log(`Not found: ${notFound}`);
  
  if (notFoundList.length > 0 && notFoundList.length <= 20) {
    console.log('\nNot found:');
    notFoundList.forEach(s => console.log(`  ${s}`));
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
