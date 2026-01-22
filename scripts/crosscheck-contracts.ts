import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(p => p.length > 0)
    .sort()
    .join(' ');
}

async function main() {
  // Parse the contracts CSV
  const csvContent = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Contratti_CLEANED.csv', 'utf-8');
  const lines = csvContent.split('\n');
  
  // Extract unique student names from contracts (excluding Benedetta)
  const contractStudents = new Map<string, { rawName: string; course: string; commercial: string }>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    
    if (parts.length >= 9 && parts[0].trim()) {
      const studentName = parts[0].trim();
      const course = parts[1].trim();
      const commercial = parts[7].trim();
      
      // Skip Benedetta's leads
      if (commercial.toLowerCase().includes('benedetta')) continue;
      
      if (studentName && course) {
        const key = normalizeName(studentName);
        if (!contractStudents.has(key)) {
          contractStudents.set(key, { rawName: studentName, course, commercial });
        }
      }
    }
  }
  
  console.log(`Contract students (excluding Benedetta): ${contractStudents.size}\n`);
  
  // Get all enrolled leads from DB
  const enrolledLeads = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    select: {
      name: true,
      course: { select: { name: true } },
      enrolled: true
    }
  });
  
  const dbEnrolledNames = new Map<string, typeof enrolledLeads[0]>();
  for (const lead of enrolledLeads) {
    dbEnrolledNames.set(normalizeName(lead.name), lead);
  }
  
  console.log(`Enrolled in DB: ${enrolledLeads.length}\n`);
  
  // Cross-check: Contract students that are NOT enrolled in DB
  const notEnrolledInDB: Array<{ name: string; course: string; commercial: string }> = [];
  const enrolledInDB: Array<{ name: string; course: string }> = [];
  
  for (const [normalizedName, student] of contractStudents) {
    if (dbEnrolledNames.has(normalizedName)) {
      enrolledInDB.push({ name: student.rawName, course: student.course });
    } else {
      notEnrolledInDB.push({ name: student.rawName, course: student.course, commercial: student.commercial });
    }
  }
  
  console.log(`=== CROSS-CHECK RESULTS ===`);
  console.log(`Contract students found as ENROLLED in DB: ${enrolledInDB.length}`);
  console.log(`Contract students NOT enrolled in DB: ${notEnrolledInDB.length}`);
  
  if (notEnrolledInDB.length > 0) {
    console.log(`\n=== MISSING FROM DB (should be enrolled) ===`);
    notEnrolledInDB.forEach(s => {
      console.log(`  ${s.name} - ${s.course} (${s.commercial})`);
    });
  }
  
  // Also check: Are there leads in DB with these names but NOT marked as enrolled?
  console.log(`\n=== CHECKING FOR UNENROLLED MATCHES ===`);
  
  const allLeads = await prisma.lead.findMany({
    where: { status: { not: 'ISCRITTO' } },
    select: { name: true, status: true, course: { select: { name: true } } }
  });
  
  const unenrolledNames = new Map<string, typeof allLeads[0]>();
  for (const lead of allLeads) {
    unenrolledNames.set(normalizeName(lead.name), lead);
  }
  
  let foundUnenrolled = 0;
  for (const student of notEnrolledInDB) {
    const normalizedName = normalizeName(student.name);
    const match = unenrolledNames.get(normalizedName);
    if (match) {
      console.log(`  FOUND but not enrolled: ${student.name} - status: ${match.status} - course: ${match.course?.name}`);
      foundUnenrolled++;
    }
  }
  
  if (foundUnenrolled === 0 && notEnrolledInDB.length > 0) {
    console.log(`  None of the missing contract students exist in DB at all`);
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total contract students: ${contractStudents.size}`);
  console.log(`Matched as enrolled: ${enrolledInDB.length}`);
  console.log(`Missing entirely: ${notEnrolledInDB.length - foundUnenrolled}`);
  console.log(`In DB but wrong status: ${foundUnenrolled}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
