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
  const csv = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const rows: any[] = parse(csv, { columns: true, skip_empty_lines: true });
  
  // Get unique enrollments
  const seen = new Set<string>();
  const toEnroll: { name: string; course: string }[] = [];
  
  for (const r of rows) {
    const n = normalize(r['Studente']);
    if (n.includes('manuel alvaro') || n.includes('benedetta barbarisi')) continue;
    const key = `${n}|${normalize(r['Corso'])}`;
    if (!seen.has(key)) {
      seen.add(key);
      toEnroll.push({ name: r['Studente'].trim(), course: r['Corso'] });
    }
  }
  
  console.log(`Need to enroll: ${toEnroll.length}`);
  
  // Get current enrolled
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  
  const enrolledKeys = new Set(enrolled.map(l => `${normalize(l.name)}|${normalize(l.course?.name || '')}`));
  console.log(`Already enrolled: ${enrolled.length}`);
  
  // Find missing
  const missing = toEnroll.filter(e => !enrolledKeys.has(`${normalize(e.name)}|${normalize(e.course)}`));
  console.log(`Still need to enroll: ${missing.length}`);
  
  if (missing.length === 0) {
    console.log('All done!');
    await prisma.$disconnect();
    return;
  }
  
  // Get leads index
  const allLeads = await prisma.lead.findMany({ include: { course: true } });
  const leadsByName = new Map<string, typeof allLeads>();
  for (const l of allLeads) {
    const n = normalize(l.name);
    if (!leadsByName.has(n)) leadsByName.set(n, []);
    leadsByName.get(n)!.push(l);
  }
  
  const courses = await prisma.course.findMany();
  const courseMap = new Map(courses.map(c => [normalize(c.name), c]));
  
  const users = await prisma.user.findMany();
  const defaultUser = users[0];
  
  // Process missing - 20 at a time
  const batch = missing.slice(0, 20);
  let done = 0;
  let created = 0;
  
  for (const student of batch) {
    const normName = normalize(student.name);
    const normCourse = normalize(student.course);
    const price = coursePrices[normCourse] || 577;
    
    const leads = leadsByName.get(normName) || [];
    let lead = leads.find(l => normalize(l.course?.name || '') === normCourse);
    if (!lead && leads.length > 0) lead = leads[0];
    
    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'ISCRITTO', enrolled: true, revenue: price }
      });
      done++;
    } else {
      const courseRec = courseMap.get(normCourse);
      if (courseRec) {
        await prisma.lead.create({
          data: {
            name: student.name,
            courseId: courseRec.id,
            assignedToId: defaultUser.id,
            status: 'ISCRITTO',
            enrolled: true,
            revenue: price,
            source: 'MANUAL'
          }
        });
        created++;
      }
    }
  }
  
  console.log(`Enrolled: ${done}, Created: ${created}`);
  console.log(`Remaining: ${missing.length - batch.length}`);
  
  if (missing.length > batch.length) {
    console.log('\nRun again to continue...');
  }
  
  await prisma.$disconnect();
}

run().catch(console.error);
