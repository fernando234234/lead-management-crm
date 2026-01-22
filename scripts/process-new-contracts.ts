import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Load the new xlsx
const wb = XLSX.readFile('C:\\Users\\ferna\\Desktop\\EastSIde-Project\\v3\\IMMAGINI ORIGINALI\\Contratti  JfContract (6).xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet) as any[];

console.log(`=== NEW CONTRACTS FILE ===`);
console.log(`Sheet names: ${wb.SheetNames.join(', ')}`);
console.log(`Total rows: ${data.length}`);

// Show columns
if (data.length > 0) {
  console.log(`\nColumns: ${Object.keys(data[0]).join(', ')}`);
}

// Show first 5 rows
console.log(`\n=== FIRST 5 ROWS ===`);
data.slice(0, 5).forEach((row, i) => {
  console.log(`${i + 1}. ${JSON.stringify(row)}`);
});

// Count by what looks like commercial column
console.log(`\n=== ANALYZING DATA ===`);
const cols = Object.keys(data[0] || {});
console.log(`Looking for student/commercial columns...`);

// Try to find the right columns
let studentCol = cols.find(c => c.toLowerCase().includes('studente')) || cols[0];
let commercialCol = cols.find(c => c.toLowerCase().includes('commerciale')) || cols[7];
let corsoCol = cols.find(c => c.toLowerCase() === 'corso') || cols[1];
let dataStipulaCol = cols.find(c => c.toLowerCase().includes('stipula')) || cols[8];

console.log(`Student column: ${studentCol}`);
console.log(`Commercial column: ${commercialCol}`);
console.log(`Corso column: ${corsoCol}`);
console.log(`Data Stipula column: ${dataStipulaCol}`);

// Count valid rows
let validRows = 0;
const byCommercial = new Map<string, number>();
const students = new Map<string, any[]>();

for (const row of data) {
  const student = String(row[studentCol] || '').trim();
  const commercial = String(row[commercialCol] || '').trim();
  const corso = String(row[corsoCol] || '').trim();
  
  if (student && student.toLowerCase() !== 'studente') {
    validRows++;
    byCommercial.set(commercial, (byCommercial.get(commercial) || 0) + 1);
    
    const key = student.toLowerCase();
    if (!students.has(key)) {
      students.set(key, []);
    }
    students.get(key)!.push({ student, corso, commercial, dataStipula: row[dataStipulaCol] });
  }
}

console.log(`\nValid data rows: ${validRows}`);
console.log(`Unique students: ${students.size}`);

console.log(`\n=== BY COMMERCIAL ===`);
[...byCommercial.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([comm, count]) => {
    console.log(`  ${comm}: ${count}`);
  });

await prisma.$disconnect();
