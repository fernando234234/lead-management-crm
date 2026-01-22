import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareAll() {
  // Load new contracts file
  const workbook = XLSX.readFile('C:/Users/ferna/Desktop/EastSIde-Project/v3/IMMAGINI ORIGINALI/Contratti  JfContract (6).xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);
  
  // First row is actually headers, skip it
  const rows = rawRows.slice(1).map(row => ({
    name: row['Contratti | JfContract'] || '',
    course: row['__EMPTY'] || '',
    commerciale: row['__EMPTY_5'] || ''
  })).filter(r => r.name && r.name !== 'Studente');
  
  console.log('=== COMPARING CONTRACTS FILE VS DB ===\n');
  console.log('Total students in xlsx:', rows.length);
  
  // Get all enrolled from DB
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true, assignedTo: true }
  });
  console.log('Total enrolled in DB:', enrolled.length);
  
  // Normalize names for comparison
  const normalize = (s: any) => (s || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Build map of enrolled by normalized name
  const enrolledByName = new Map<string, typeof enrolled[0][]>();
  for (const e of enrolled) {
    const name = normalize(e.name);
    if (!enrolledByName.has(name)) enrolledByName.set(name, []);
    enrolledByName.get(name)!.push(e);
  }
  
  // Course name mapping (xlsx names to DB names)
  const courseMap: Record<string, string> = {
    'masterclass graphic web design': 'masterclass graphic web design',
    'masterclass ai': 'masterclass ai',
    'social media manager': 'social media manager',
    'graphic design': 'graphic design',
    'revit': 'revit',
    'masterclass game design': 'masterclass game design',
    'interior planner': 'interior planner',
    'brand communication': 'brand communication',
    'blender / 3d': 'blender / 3d',
    'attività individuale': 'attività individuale',
    'ux/ui design': 'ux/ui design',
    'narrative design': 'narrative design',
    'character design': 'character design',
    'motion design': 'motion design',
    'web design': 'web design',
  };
  
  // Check each contract row
  const missing: { name: string; course: string; commerciale: string }[] = [];
  const found: { name: string; course: string; match: string; dbName?: string; dbCourse?: string }[] = [];
  
  for (const row of rows) {
    const normName = normalize(row.name);
    const normCourse = normalize(row.course);
    
    // Try exact name match
    if (enrolledByName.has(normName)) {
      const matches = enrolledByName.get(normName)!;
      // Check if any match has matching course
      const courseMatch = matches.find(m => {
        const mCourse = normalize(m.course?.name || '');
        return mCourse === normCourse || 
               mCourse.includes(normCourse) || 
               normCourse.includes(mCourse);
      });
      if (courseMatch) {
        found.push({ name: row.name, course: row.course, match: 'exact', dbName: courseMatch.name, dbCourse: courseMatch.course?.name });
        continue;
      }
      // Name matches but course doesn't - still count as found but note it
      found.push({ name: row.name, course: row.course, match: 'name-only-diff-course', dbName: matches[0].name, dbCourse: matches[0].course?.name });
      continue;
    }
    
    // Try partial/fuzzy name match
    let partialMatch = false;
    for (const [eName, eList] of enrolledByName) {
      // Check if names are very similar
      const nameParts = normName.split(' ');
      const eNameParts = eName.split(' ');
      
      // Match if first and last name match (in any order)
      const firstMatch = nameParts.some(p => eNameParts.includes(p) && p.length > 2);
      const lastMatch = nameParts.some(p => eNameParts.includes(p) && p.length > 2);
      
      if (firstMatch && nameParts.length > 1 && eNameParts.length > 1) {
        // Check first+last or last+first
        if ((nameParts[0] === eNameParts[0] && nameParts[nameParts.length-1] === eNameParts[eNameParts.length-1]) ||
            (normName.includes(eName) || eName.includes(normName))) {
          const e = eList[0];
          found.push({ name: row.name, course: row.course, match: 'fuzzy-name', dbName: e.name, dbCourse: e.course?.name });
          partialMatch = true;
          break;
        }
      }
    }
    
    if (!partialMatch) {
      missing.push({ name: row.name, course: row.course, commerciale: row.commerciale });
    }
  }
  
  console.log('\n--- Results ---');
  console.log('Found in DB:', found.length);
  console.log('MISSING from DB:', missing.length);
  
  if (missing.length > 0) {
    console.log('\n=== MISSING STUDENTS (not enrolled in DB) ===');
    missing.forEach((m, i) => {
      console.log(`${i+1}. ${m.name} | ${m.course} | ${m.commerciale}`);
    });
  }
  
  // Show stats by match type
  const matchTypes = found.reduce((acc, f) => {
    acc[f.match] = (acc[f.match] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n--- Match Types ---');
  Object.entries(matchTypes).forEach(([type, count]) => {
    console.log(`${type}: ${count}`);
  });
  
  await prisma.$disconnect();
}

compareAll().catch(console.error);
