import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

async function run() {
  // Get unique courses from CSV
  const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true, 
    relax_column_count: true 
  });
  
  const csvCourses = new Set<string>();
  for (const row of data) {
    csvCourses.add(row['Corso']);
  }
  
  console.log('=== COURSES IN CSV ===');
  Array.from(csvCourses).sort().forEach(c => console.log(`  ${c}`));
  console.log(`Total: ${csvCourses.size}\n`);
  
  // Get courses from DB
  const dbCourses = await prisma.course.findMany();
  
  console.log('=== COURSES IN DB ===');
  dbCourses.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => console.log(`  ${c.name}`));
  console.log(`Total: ${dbCourses.length}\n`);
  
  // Check which CSV courses DON'T have exact match in DB
  const dbCourseNames = new Set(dbCourses.map(c => normalize(c.name)));
  
  console.log('=== CSV COURSES WITHOUT EXACT DB MATCH ===');
  const noMatch: string[] = [];
  for (const csvCourse of csvCourses) {
    if (!dbCourseNames.has(normalize(csvCourse))) {
      noMatch.push(csvCourse);
    }
  }
  noMatch.sort().forEach(c => console.log(`  ${c}`));
  console.log(`Total without match: ${noMatch.length}`);
  
  await prisma.$disconnect();
}

run().catch(console.error);
