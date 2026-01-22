import fs from 'fs';

function parseCSV(text: string): Record<string, string>[] {
  const result: Record<string, string>[] = [];
  let headers: string[] = [];
  let inQuote = false;
  let currentCell = '';
  let currentRow: string[] = [];
  let isFirstRow = true;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuote && nextChar === '"') { currentCell += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (char === ',' && !inQuote) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuote) {
      if (char === '\r') i++;
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (isFirstRow) { headers = currentRow; isFirstRow = false; }
      else if (currentRow.some(c => c)) {
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => { obj[h] = currentRow[idx] || ''; });
        result.push(obj);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }
  return result;
}

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

const contracts = parseCSV(fs.readFileSync(String.raw`C:\Users\ferna\Downloads\Contratti_VALID_485.csv`, 'utf-8'));

// Group by student name
const byStudent = new Map<string, string[]>();
for (const c of contracts) {
  const name = normalize(c.Studente);
  if (!byStudent.has(name)) byStudent.set(name, []);
  byStudent.get(name)!.push(c.Corso);
}

// Find students with multiple contracts
let multiCount = 0;
console.log('Students with multiple contracts:');
for (const [name, courses] of byStudent) {
  if (courses.length > 1) {
    multiCount++;
    console.log(`  ${name}: ${courses.join(', ')}`);
  }
}
console.log(`\nTotal students with multiple contracts: ${multiCount}`);
console.log(`Total unique students: ${byStudent.size}`);
console.log(`Total contracts: ${contracts.length}`);
