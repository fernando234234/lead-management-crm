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

// Course equivalence mapping
function normalizeCourse(course: string): string {
  const c = normalize(course);
  
  // Blender variants
  if (c.includes('blender') || c === '3d modeling' || c === 'mastering blender') {
    return 'blender';
  }
  
  return c;
}

const contracts = parseCSV(fs.readFileSync(String.raw`C:\Users\ferna\Downloads\Contratti_VALID_485.csv`, 'utf-8'));
const leads = parseCSV(fs.readFileSync(String.raw`C:\Users\ferna\Downloads\Dashboard_Merged_Final_CLEANED.csv`, 'utf-8'));

console.log(`Contracts: ${contracts.length}`);
console.log(`Leads: ${leads.length}`);

// Build lead lookup by name -> courses
const leadsByName = new Map<string, Set<string>>();
for (const l of leads) {
  const name = normalize(l['Nome Leads'] || '');
  const course = normalize(l['Corso'] || '');
  if (name && course) {
    if (!leadsByName.has(name)) leadsByName.set(name, new Set());
    leadsByName.get(name)!.add(course);
    leadsByName.get(name)!.add(normalizeCourse(course)); // Add normalized version too
  }
}

// Check each contract
let exactMatch = 0;
let nameOnlyMatch = 0;  // Name exists but different course
let blenderMatch = 0;    // Blender variant match
let noMatch = 0;

const noMatchList: string[] = [];

for (const c of contracts) {
  const name = normalize(c.Studente);
  const course = normalize(c.Corso);
  const courseNorm = normalizeCourse(c.Corso);
  
  const leadCourses = leadsByName.get(name);
  
  if (!leadCourses) {
    noMatch++;
    noMatchList.push(`${c.Studente} - ${c.Corso}`);
  } else if (leadCourses.has(course)) {
    exactMatch++;
  } else if (leadCourses.has(courseNorm)) {
    blenderMatch++;
  } else {
    nameOnlyMatch++;
  }
}

console.log(`\n=== MATCHING RESULTS ===`);
console.log(`Exact match (name+course):     ${exactMatch}`);
console.log(`Blender variant match:         ${blenderMatch}`);
console.log(`Name exists, diff course:      ${nameOnlyMatch}`);
console.log(`Name not found at all:         ${noMatch}`);
console.log(`TOTAL:                         ${exactMatch + blenderMatch + nameOnlyMatch + noMatch}`);

console.log(`\n=== TRULY MISSING (name not in leads at all) ===`);
for (const m of noMatchList) {
  console.log(`  - ${m}`);
}
