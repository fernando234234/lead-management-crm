import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Load the NEW xlsx to get full details of new students
const newWb = XLSX.readFile('C:\\Users\\ferna\\Desktop\\EastSIde-Project\\v3\\IMMAGINI ORIGINALI\\Contratti  JfContract (6).xlsx');
const newSheet = newWb.Sheets[newWb.SheetNames[0]];
const newData = XLSX.utils.sheet_to_json(newSheet) as any[];

// The new students to add
const NEW_STUDENTS = [
  'serena cerioni',
  'alice rossi',
  'roberta bonato',
  'elisa eleonora milano',
  'mena panariello',
  'francesco de lorenzis',
  'elena villella',
  'federica lupoli',
  'clementina dellacasa'
];

// Course normalization
const COURSE_MAP: Record<string, string> = {
  'social media manager': 'Social Media Manager',
  'revit': 'Revit',
  'masterclass graphic web design': 'Masterclass Graphic Web Design',
  'masterclass ai': 'Masterclass Ai',
  'grafica pubblicitaria': 'Graphic Design',
  'graphic design': 'Graphic Design',
};

function normalizeCourse(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/\d+\s*(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s*2k?\d{2,4}/gi, '')
    .replace(/^(xlviii|xlvii|xlvi|xlv|xliv|xliii|xlii|xli|xl|xxxix|xlix|l|li|lii)\s*/i, '')
    .replace(/\s*-\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Find matching course
  for (const [key, value] of Object.entries(COURSE_MAP)) {
    if (cleaned.includes(key)) {
      return value;
    }
  }
  
  return cleaned;
}

function normalizeCommercial(name: string): string {
  const lower = name.toLowerCase().trim();
  const firstName = lower.split(/\s+/)[0];
  return `${firstName}.`;
}

async function main() {
  console.log('=== ADDING NEW CONTRACTS ===\n');
  
  // Get columns from xlsx
  const cols = Object.keys(newData[0] || {});
  const studentCol = cols[0];
  const corsoCol = cols[1];
  
  // Find rows for new students - need to find commercial column
  // Looking at the xlsx structure, we need to find commercial
  console.log('Columns:', cols.join(', '));
  
  // The xlsx has merged header - let's find the data rows for our students
  const newStudentRows: any[] = [];
  
  for (const row of newData) {
    const student = String(row[studentCol] || '').trim().toLowerCase();
    const normalizedStudent = student.replace(/\s+/g, ' ').replace(/[^a-z\s]/g, '');
    
    if (NEW_STUDENTS.some(s => normalizedStudent.includes(s) || s.includes(normalizedStudent))) {
      newStudentRows.push({
        rawName: row[studentCol],
        rawCourse: row[corsoCol],
        row: row
      });
    }
  }
  
  console.log(`Found ${newStudentRows.length} rows for new students:\n`);
  newStudentRows.forEach(r => {
    console.log(`  ${r.rawName} - ${r.rawCourse}`);
    console.log(`    All columns: ${JSON.stringify(r.row)}`);
  });
  
  // Get courses from DB
  const courses = await prisma.course.findMany({
    select: { id: true, name: true, price: true }
  });
  const courseMap = new Map(courses.map(c => [c.name.toLowerCase(), c]));
  
  // Get users
  const users = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, username: true }
  });
  const userMap = new Map(users.map(u => [u.username.toLowerCase(), u.id]));
  
  // Get campaigns by course
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, courseId: true }
  });
  const campaignByCourse = new Map(campaigns.filter(c => c.courseId).map(c => [c.courseId!, c.id]));
  
  console.log('\n=== PROCESSING ===\n');
  
  // New students extracted from JfContract (6).xlsx - Col 6 is Commercial
  const studentsToAdd = [
    { name: 'Serena Cerioni', course: 'Social Media Manager', commercial: 'marcella.', dataStipula: '20/01/2026' },
    { name: 'Alice Rossi', course: 'Social Media Manager', commercial: 'marcella.', dataStipula: '20/01/2026' },
    { name: 'Roberta Bonato', course: 'Revit', commercial: 'simone.', dataStipula: '20/01/2026' },
    { name: 'Elisa Eleonora Milano', course: 'Masterclass Graphic Web Design', commercial: 'marcella.', dataStipula: '20/01/2026' },
    { name: 'Mena Panariello', course: 'Masterclass Graphic Web Design', commercial: 'silvana.', dataStipula: '20/01/2026' },
    { name: 'Francesco De Lorenzis', course: 'Masterclass Ai', commercial: 'natascia.', dataStipula: '20/01/2026' },
    { name: 'Elena Villella', course: 'Masterclass Graphic Web Design', commercial: 'simone.', dataStipula: '19/01/2026' },
    { name: 'Federica Lupoli', course: 'Graphic Design', commercial: 'martina.', dataStipula: '19/01/2026' },
    { name: 'Clementina Dellacasa', course: 'Masterclass Ai', commercial: 'natascia.', dataStipula: '17/01/2026' },
  ];
  
  let created = 0;
  
  for (const student of studentsToAdd) {
    const course = courseMap.get(student.course.toLowerCase());
    if (!course) {
      console.log(`ERROR: Course not found: ${student.course}`);
      continue;
    }
    
    const assignedToId = userMap.get(student.commercial) || null;
    const campaignId = campaignByCourse.get(course.id) || null;
    
    // Check if already exists
    const existing = await prisma.lead.findFirst({
      where: {
        name: { contains: student.name.split(' ')[1], mode: 'insensitive' },
        courseId: course.id
      }
    });
    
    if (existing) {
      console.log(`SKIP: ${student.name} already exists for ${student.course}`);
      continue;
    }
    
    await prisma.lead.create({
      data: {
        name: student.name,
        courseId: course.id,
        campaignId: campaignId,
        assignedToId: assignedToId,
        status: 'ISCRITTO',
        enrolled: true,
        enrolledAt: new Date(),
        contacted: true,
        contactedAt: new Date(),
        revenue: course.price,
        source: 'LEGACY_IMPORT',
        notes: 'Imported from contracts (JfContract 6)'
      }
    });
    
    console.log(`CREATED: ${student.name} - ${student.course} - €${course.price}`);
    created++;
  }
  
  // Show new totals
  const totalLeads = await prisma.lead.count();
  const totalEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const totalRevenue = await prisma.lead.aggregate({
    where: { status: 'ISCRITTO' },
    _sum: { revenue: true }
  });
  
  console.log('\n=== RESULTS ===');
  console.log(`Created: ${created}`);
  console.log(`Total leads: ${totalLeads}`);
  console.log(`Total enrolled: ${totalEnrolled}`);
  console.log(`Total revenue: €${totalRevenue._sum.revenue}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
