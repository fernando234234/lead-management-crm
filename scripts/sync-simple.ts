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

async function main() {
  // Load CSV
  const csv = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const rows: any[] = parse(csv, { columns: true, skip_empty_lines: true });
  
  // Build unique enrollments
  const seen = new Set<string>();
  const enrollments: { name: string; course: string }[] = [];
  
  for (const r of rows) {
    const n = normalize(r['Studente']);
    if (n.includes('manuel alvaro') || n.includes('benedetta barbarisi')) continue;
    const c = normalize(r['Corso']);
    const k = `${n}|${c}`;
    if (!seen.has(k)) {
      seen.add(k);
      enrollments.push({ name: r['Studente'].trim(), course: r['Corso'] });
    }
  }
  
  console.log(`Enrollments to process: ${enrollments.length}`);
  
  // Get leads
  const leads = await prisma.lead.findMany({ include: { course: true } });
  console.log(`Leads in DB: ${leads.length}`);
  
  // Index by name
  const byName = new Map<string, typeof leads>();
  for (const l of leads) {
    const n = normalize(l.name);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n)!.push(l);
  }
  
  // Get courses
  const courses = await prisma.course.findMany();
  const courseMap = new Map(courses.map(c => [normalize(c.name), c]));
  
  // Default user
  const users = await prisma.user.findMany();
  const defaultUser = users[0];
  
  // Collect all updates
  const updates: { id: string; price: number }[] = [];
  const creates: { name: string; courseId: string; price: number }[] = [];
  const notFound: string[] = [];
  
  for (const e of enrollments) {
    const nn = normalize(e.name);
    const nc = normalize(e.course);
    const price = coursePrices[nc] || 577;
    
    const nameLeads = byName.get(nn) || [];
    let lead = nameLeads.find(l => normalize(l.course?.name || '') === nc);
    if (!lead && nameLeads.length > 0) lead = nameLeads[0];
    
    if (lead) {
      updates.push({ id: lead.id, price });
    } else {
      const course = courseMap.get(nc);
      if (course) {
        creates.push({ name: e.name, courseId: course.id, price });
      } else {
        notFound.push(`${e.name} | ${e.course}`);
      }
    }
  }
  
  console.log(`\nTo update: ${updates.length}`);
  console.log(`To create: ${creates.length}`);
  console.log(`Not found: ${notFound.length}`);
  
  // Batch update using raw SQL for speed
  if (updates.length > 0) {
    console.log('\nUpdating leads...');
    const ids = updates.map(u => u.id);
    
    // Update all at once
    await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { status: 'ISCRITTO', enrolled: true }
    });
    
    // Update prices individually (different prices)
    for (let i = 0; i < updates.length; i++) {
      await prisma.lead.update({
        where: { id: updates[i].id },
        data: { revenue: updates[i].price }
      });
      if ((i + 1) % 50 === 0) console.log(`  Updated ${i + 1}/${updates.length}`);
    }
    console.log(`  Updated ${updates.length}/${updates.length}`);
  }
  
  // Create new leads
  if (creates.length > 0) {
    console.log('\nCreating new leads...');
    for (let i = 0; i < creates.length; i++) {
      await prisma.lead.create({
        data: {
          name: creates[i].name,
          courseId: creates[i].courseId,
          assignedToId: defaultUser.id,
          status: 'ISCRITTO',
          enrolled: true,
          revenue: creates[i].price,
          source: 'MANUAL'
        }
      });
      if ((i + 1) % 10 === 0) console.log(`  Created ${i + 1}/${creates.length}`);
    }
    console.log(`  Created ${creates.length}/${creates.length}`);
  }
  
  if (notFound.length > 0) {
    console.log('\nNot found:');
    notFound.slice(0, 10).forEach(s => console.log(`  ${s}`));
    if (notFound.length > 10) console.log(`  ... and ${notFound.length - 10} more`);
  }
  
  // Final stats
  const stats = await prisma.lead.groupBy({ by: ['status'], _count: true });
  console.log('\n=== FINAL STATUS ===');
  stats.forEach(s => console.log(`  ${s.status}: ${s._count}`));
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
