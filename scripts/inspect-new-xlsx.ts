import * as XLSX from 'xlsx';

// Load the NEW xlsx
const newWb = XLSX.readFile('C:\\Users\\ferna\\Desktop\\EastSIde-Project\\v3\\IMMAGINI ORIGINALI\\Contratti  JfContract (6).xlsx');
const newSheet = newWb.Sheets[newWb.SheetNames[0]];

// Get as array of arrays to see raw structure
const rawData = XLSX.utils.sheet_to_json(newSheet, { header: 1 }) as any[][];

console.log('=== FIRST 5 ROWS (RAW) ===');
rawData.slice(0, 5).forEach((row, i) => {
  console.log(`Row ${i}: ${JSON.stringify(row)}`);
});

// Find rows with our new students
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

console.log('\n=== NEW STUDENT ROWS ===');
for (const row of rawData) {
  if (!row[0]) continue;
  const studentName = String(row[0]).toLowerCase().replace(/\s+/g, ' ').trim();
  
  for (const newStudent of NEW_STUDENTS) {
    if (studentName.includes(newStudent) || newStudent.includes(studentName.split(' ').slice(0, 2).join(' '))) {
      console.log(`\nFound: ${row[0]}`);
      console.log(`  Full row: ${JSON.stringify(row)}`);
      console.log(`  Col 0 (Student): ${row[0]}`);
      console.log(`  Col 1 (Corso?): ${row[1]}`);
      console.log(`  Col 2: ${row[2]}`);
      console.log(`  Col 3: ${row[3]}`);
      console.log(`  Col 4: ${row[4]}`);
      console.log(`  Col 5: ${row[5]}`);
      console.log(`  Col 6: ${row[6]}`);
      console.log(`  Col 7: ${row[7]}`);
      console.log(`  Col 8: ${row[8]}`);
      console.log(`  Col 9: ${row[9]}`);
      break;
    }
  }
}
