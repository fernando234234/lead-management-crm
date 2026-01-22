import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('C:/Users/ferna/Desktop/EastSIde-Project/v3/IMMAGINI ORIGINALI/Contratti  JfContract (6).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows: any[] = XLSX.utils.sheet_to_json(sheet);

console.log('Sheet names:', workbook.SheetNames);
console.log('Total rows:', rows.length);
console.log('\nColumn headers:', Object.keys(rows[0] || {}));
console.log('\nFirst 3 rows:');
rows.slice(0, 3).forEach((r, i) => console.log(i+1, JSON.stringify(r)));
