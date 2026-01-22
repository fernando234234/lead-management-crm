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
  // Parse the contracts CSV - get ALL contract students
  const csvContent = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Contratti_CLEANED.csv', 'utf-8');
  const lines = csvContent.split('\n');
  
  const contractStudents = new Set<string>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    
    if (parts.length >= 9 && parts[0].trim()) {
      const studentName = parts[0].trim();
      if (studentName) {
        contractStudents.add(normalizeName(studentName));
      }
    }
  }
  
  console.log(`Total unique names in Contratti_CLEANED.csv: ${contractStudents.size}\n`);
  
  // Get all enrolled leads from DB
  const enrolledLeads = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    select: {
      name: true,
      course: { select: { name: true } },
      assignedTo: { select: { name: true } },
      source: true,
      createdAt: true
    }
  });
  
  console.log(`Total ENROLLED in DB: ${enrolledLeads.length}\n`);
  
  // Find enrolled leads NOT in contracts
  const enrolledNotInContracts: typeof enrolledLeads = [];
  const enrolledInContracts: typeof enrolledLeads = [];
  
  for (const lead of enrolledLeads) {
    const normalizedName = normalizeName(lead.name);
    if (contractStudents.has(normalizedName)) {
      enrolledInContracts.push(lead);
    } else {
      enrolledNotInContracts.push(lead);
    }
  }
  
  console.log(`=== REVERSE CROSS-CHECK ===`);
  console.log(`Enrolled leads FOUND in contracts: ${enrolledInContracts.length}`);
  console.log(`Enrolled leads NOT in contracts: ${enrolledNotInContracts.length}`);
  
  if (enrolledNotInContracts.length > 0) {
    console.log(`\n=== ENROLLED IN DB BUT NOT IN CONTRACTS (first 50) ===`);
    enrolledNotInContracts.slice(0, 50).forEach(l => {
      console.log(`  ${l.name} - ${l.course?.name || 'No course'} - ${l.assignedTo?.name || 'No commercial'} - source: ${l.source}`);
    });
    
    if (enrolledNotInContracts.length > 50) {
      console.log(`  ... and ${enrolledNotInContracts.length - 50} more`);
    }
    
    // Group by source
    const bySource = new Map<string, number>();
    for (const l of enrolledNotInContracts) {
      const src = l.source || 'UNKNOWN';
      bySource.set(src, (bySource.get(src) || 0) + 1);
    }
    
    console.log(`\n=== BY SOURCE ===`);
    for (const [source, count] of bySource) {
      console.log(`  ${source}: ${count}`);
    }
    
    // Group by course
    const byCourse = new Map<string, number>();
    for (const l of enrolledNotInContracts) {
      const course = l.course?.name || 'No course';
      byCourse.set(course, (byCourse.get(course) || 0) + 1);
    }
    
    console.log(`\n=== BY COURSE (top 15) ===`);
    const sortedCourses = [...byCourse.entries()].sort((a, b) => b[1] - a[1]);
    sortedCourses.slice(0, 15).forEach(([course, count]) => {
      console.log(`  ${course}: ${count}`);
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
