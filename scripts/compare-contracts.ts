import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Course name normalization mapping (from our earlier normalization work)
const COURSE_ALIASES: Record<string, string> = {
  'masterclass graphic web design': 'Masterclass Graphic Web Design',
  'graphic design': 'Graphic Design',
  'masterclass ai': 'Masterclass Ai',
  'masterclass full developer': 'Masterclass Full Developer',
  'masterclass architectural design': 'Masterclass Architectural Design',
  'revit': 'Revit',
  'blender / 3d': 'Blender / 3D',
  'blender': 'Blender / 3D',
  'mastering blender': 'Mastering Blender',
  'illustrazione digitale': 'Illustrazione Digitale',
  'character design': 'Character Design',
  'user interface design': 'User Interface Design',
  'user experience design': 'User Experience Design',
  'ux/ui mobile design': 'Ux/Ui Mobile Design',
  'digital publishing': 'Digital Publishing',
  'brand communication': 'Brand Communication',
  'logo design': 'Logo Design',
  'video editing': 'Video Editing',
  'motion design': 'Motion Design',
  'masterclass game design': 'Masterclass Game Design',
  'archviz': 'Archviz',
  'excel essentials': 'Excel Essentials',
  'autocad': 'AutoCad',
  'interior planner': 'Interior Planner',
  'photoshop': 'PhotoShop',
  'indesign': 'Indesign',
  'illustrator': 'Illustrator',
  'after effects': 'After Effects',
};

function normalizeCourseName(raw: string): string {
  const cleaned = raw
    .replace(/^(XLVIII|XLVII|XLVI|XLV|XLIV|XLIII|XLII|XLI|XL|XXXIX|XLIX|L|LI|LII)\s*/i, '') // Roman numerals
    .replace(/\s*-\s*\d+.*$/i, '') // " - 30 Gennaio 2k26"
    .replace(/\s*(pro|plus)?\s*\d+\s*(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s*2k?\d{2,4}/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const lower = cleaned.toLowerCase();
  return COURSE_ALIASES[lower] || cleaned;
}

function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(p => p.length > 0)
    .sort() // Sort name parts to handle "Mario Rossi" vs "Rossi Mario"
    .join(' ');
}

interface ContractStudent {
  rawName: string;
  normalizedName: string;
  course: string;
  normalizedCourse: string;
  commercial: string;
  dataStipula: string;
  statoPagamenti: string;
}

async function main() {
  // Read and parse CSV
  const csvContent = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Contratti_CLEANED.csv', 'utf-8');
  const lines = csvContent.split('\n');
  
  // Parse CSV - handle multiline fields
  const students: ContractStudent[] = [];
  let currentRow: string[] = [];
  let inQuotedField = false;
  let quotedContent = '';
  
  for (let i = 1; i < lines.length; i++) { // Skip header
    const line = lines[i];
    
    if (inQuotedField) {
      quotedContent += '\n' + line;
      if (line.includes('"')) {
        inQuotedField = false;
        currentRow.push(quotedContent.replace(/"/g, ''));
        quotedContent = '';
      }
      continue;
    }
    
    // Simple CSV parse for this specific format
    const parts = line.split(',');
    
    if (parts.length >= 9 && parts[0].trim()) {
      const studentName = parts[0].trim();
      const course = parts[1].trim();
      const commercial = parts[7].trim();
      const dataStipula = parts[8].trim();
      const statoPagamenti = parts[6].trim();
      
      if (studentName && course) {
        students.push({
          rawName: studentName,
          normalizedName: normalizeName(studentName),
          course: course,
          normalizedCourse: normalizeCourseName(course),
          commercial: commercial,
          dataStipula: dataStipula,
          statoPagamenti: statoPagamenti
        });
      }
    }
  }
  
  // Dedupe by normalized name + course
  const uniqueStudents = new Map<string, ContractStudent>();
  for (const s of students) {
    const key = `${s.normalizedName}|${s.normalizedCourse.toLowerCase()}`;
    if (!uniqueStudents.has(key)) {
      uniqueStudents.set(key, s);
    }
  }
  
  console.log(`Total rows parsed: ${students.length}`);
  console.log(`Unique student+course combinations: ${uniqueStudents.size}`);
  
  // Get all enrolled leads from DB
  const enrolledLeads = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    select: {
      id: true,
      name: true,
      course: { select: { name: true } },
      revenue: true
    }
  });
  
  console.log(`Enrolled leads in DB: ${enrolledLeads.length}`);
  
  // Create lookup set for DB students
  const dbStudents = new Map<string, typeof enrolledLeads[0]>();
  for (const lead of enrolledLeads) {
    const key = normalizeName(lead.name);
    dbStudents.set(key, lead);
  }
  
  // Find students in contracts but NOT in DB
  const missingFromDB: ContractStudent[] = [];
  const foundInDB: ContractStudent[] = [];
  
  for (const [key, student] of uniqueStudents) {
    const nameKey = student.normalizedName;
    if (dbStudents.has(nameKey)) {
      foundInDB.push(student);
    } else {
      missingFromDB.push(student);
    }
  }
  
  console.log(`\n=== COMPARISON RESULTS ===`);
  console.log(`Found in DB: ${foundInDB.length}`);
  console.log(`Missing from DB: ${missingFromDB.length}`);
  
  // Show missing students grouped by course
  const missingByCourse = new Map<string, ContractStudent[]>();
  for (const s of missingFromDB) {
    const course = s.normalizedCourse;
    if (!missingByCourse.has(course)) {
      missingByCourse.set(course, []);
    }
    missingByCourse.get(course)!.push(s);
  }
  
  console.log(`\n=== MISSING STUDENTS BY COURSE ===`);
  for (const [course, students] of [...missingByCourse.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${course}: ${students.length} students`);
    students.slice(0, 5).forEach(s => {
      console.log(`  - ${s.rawName} (${s.commercial}, ${s.dataStipula})`);
    });
    if (students.length > 5) {
      console.log(`  ... and ${students.length - 5} more`);
    }
  }
  
  // Check which courses exist in DB
  const courses = await prisma.course.findMany({
    select: { id: true, name: true, price: true }
  });
  const courseMap = new Map(courses.map(c => [c.name.toLowerCase(), c]));
  
  console.log(`\n=== COURSE MATCHING ===`);
  const unmatchedCourses = new Set<string>();
  for (const s of missingFromDB) {
    const courseName = s.normalizedCourse.toLowerCase();
    if (!courseMap.has(courseName)) {
      unmatchedCourses.add(s.normalizedCourse);
    }
  }
  
  if (unmatchedCourses.size > 0) {
    console.log(`Courses in contracts but NOT in DB:`);
    for (const c of unmatchedCourses) {
      console.log(`  - "${c}"`);
    }
  } else {
    console.log(`All courses in contracts exist in DB!`);
  }
  
  // Export missing students to JSON for import
  const exportData = missingFromDB.map(s => ({
    name: s.rawName,
    course: s.normalizedCourse,
    commercial: s.commercial,
    dataStipula: s.dataStipula,
    statoPagamenti: s.statoPagamenti
  }));
  
  fs.writeFileSync('scripts/missing-students.json', JSON.stringify(exportData, null, 2));
  console.log(`\nExported ${exportData.length} missing students to scripts/missing-students.json`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
