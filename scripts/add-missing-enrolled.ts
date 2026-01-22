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
  'graphic design': 777,
  'blender / 3d': 577,
  'social media manager': 577,
  'revit': 577,
  'interior planner': 577,
  'brand communication': 577,
  'narrative design': 577,
  'character design': 577,
  'motion design': 577,
  'ux/ui design': 577,
  'web design': 577,
  'attività individuale': 600,
};

// Commerciale name mapping
const commercialeMap: Record<string, string> = {
  'marilena abbenante': 'Marilena',
  'silvana pacia': 'Silvana',
  'marcella abbenante': 'Marcella',
  'raffaele zambella': 'Raffaele',
  'martina sculli': 'Martina',
  'martina  sculli': 'Martina',
  'natascia lombardi': 'Natascia',
  'eleonora rossi': 'Eleonora',
  'simone cringoli': 'Simone',
  'benedetta barbarisi': null, // Skip
};

async function addMissingEnrolled() {
  // Load new cleaned CSV
  const csvContent = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log('=== ADDING MISSING ENROLLED STUDENTS ===\n');
  
  // Get all enrolled from DB
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  
  // Get all users
  const users = await prisma.user.findMany();
  const userMap = new Map(users.map(u => [u.name.toLowerCase(), u]));
  
  // Get all courses
  const courses = await prisma.course.findMany();
  const courseMap = new Map(courses.map(c => [c.name.toLowerCase(), c]));
  
  // Normalize
  const normalize = (s: any) => (s || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Build set of enrolled names
  const enrolledNames = new Set(enrolled.map(e => normalize(e.name)));
  
  // Find missing
  const missing: any[] = [];
  const skipped: string[] = [];
  
  for (const row of records) {
    const name = normalize(row['Studente']);
    const course = row['Corso'];
    const commerciale = normalize(row['Commerciale']);
    
    if (!name) continue;
    
    // Skip if already enrolled
    if (enrolledNames.has(name)) continue;
    
    // Skip Manuel Alvaro (test user) and Benedetta Barbarisi (staff)
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) {
      skipped.push(`${row['Studente']} - ${course} (excluded)`);
      continue;
    }
    
    // Skip if commerciale is Benedetta
    const commName = commercialeMap[commerciale];
    if (commName === null) {
      skipped.push(`${row['Studente']} - ${course} (Benedetta's lead)`);
      continue;
    }
    
    missing.push({
      name: row['Studente'].trim(),
      course,
      commerciale: commName || 'Simone'
    });
  }
  
  console.log('Missing students to add:', missing.length);
  console.log('Skipped:', skipped.length);
  
  if (skipped.length > 0) {
    console.log('\n--- Skipped ---');
    skipped.forEach(s => console.log(`  ${s}`));
  }
  
  // Add missing students
  let added = 0;
  let totalRevenue = 0;
  const errors: string[] = [];
  
  console.log('\n--- Adding Students ---');
  
  for (const m of missing) {
    // Find course
    let courseRecord = courseMap.get(normalize(m.course));
    
    // Try partial match if not found
    if (!courseRecord) {
      for (const [cName, c] of courseMap) {
        if (cName.includes(normalize(m.course).split(' ')[0])) {
          courseRecord = c;
          break;
        }
      }
    }
    
    // Create course if not found
    if (!courseRecord) {
      // Normalize course name for creation
      let normalizedCourseName = m.course;
      if (m.course.toLowerCase().includes('masterclass') && m.course.toLowerCase().includes('architect')) {
        normalizedCourseName = 'Masterclass Architectural Design';
        courseRecord = courseMap.get('masterclass architectural design');
      }
      
      if (!courseRecord) {
        console.log(`  Creating course: ${normalizedCourseName}`);
        courseRecord = await prisma.course.create({
          data: {
            name: normalizedCourseName,
            price: coursePrices[normalize(normalizedCourseName)] || 577
          }
        });
        courseMap.set(normalize(normalizedCourseName), courseRecord);
      }
    }
    
    // Find user
    const user = userMap.get(m.commerciale.toLowerCase());
    if (!user) {
      errors.push(`User not found: ${m.commerciale} for ${m.name}`);
      continue;
    }
    
    // Get price
    const price = coursePrices[normalize(courseRecord.name)] || Number(courseRecord.price) || 577;
    
    // Create lead
    try {
      await prisma.lead.create({
        data: {
          name: m.name,
          courseId: courseRecord.id,
          assignedToId: user.id,
          status: 'ISCRITTO',
          enrolled: true,
          revenue: price,
          source: 'MANUAL'
        }
      });
      console.log(`  ✓ ${m.name} | ${courseRecord.name} | €${price} | ${m.commerciale}`);
      added++;
      totalRevenue += price;
    } catch (err: any) {
      errors.push(`Failed to add ${m.name}: ${err.message}`);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Added: ${added}`);
  console.log(`Revenue added: €${totalRevenue}`);
  
  if (errors.length > 0) {
    console.log('\n--- Errors ---');
    errors.forEach(e => console.log(`  ${e}`));
  }
  
  // Final counts
  const finalEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const finalRevenue = await prisma.lead.aggregate({ _sum: { revenue: true } });
  console.log(`\nTotal enrolled now: ${finalEnrolled}`);
  console.log(`Total revenue now: €${finalRevenue._sum.revenue}`);
  
  await prisma.$disconnect();
}

addMissingEnrolled().catch(console.error);
