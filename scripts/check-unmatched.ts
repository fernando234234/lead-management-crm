import * as fs from 'fs';

const content = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Dashboard_Commerciale_Formazione (4) - Dati (1).csv', 'utf-8');
const lines = content.split('\n');

// Build normalized name -> commercial map
const nameToCommercial = new Map<string, string>();
for (const line of lines) {
  const cols = line.split(',');
  const rawName = (cols[1] || '').trim();
  const commercial = (cols[2] || '').trim();
  if (rawName && commercial) {
    // Normalize: lowercase, collapse whitespace
    const normalized = rawName.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!nameToCommercial.has(normalized)) {
      nameToCommercial.set(normalized, commercial);
    }
  }
}

console.log(`CSV has ${nameToCommercial.size} unique normalized names\n`);

// Test unmatched names
const testNames = [
  'Alberto  Leone',
  'Simona  Lovallo', 
  'ANNA  CECCHINATO',
  'Aurora Rondoni,',
  'Domenico Fortugno,',
  'Luca Dallaglio,',
  'Sarah Belguendouz,',
  'Rossella Arcamone, smm, in target, sa di cosa stiamo parlando.'
];

console.log('=== CHECKING UNMATCHED NAMES ===\n');
for (const testName of testNames) {
  const normalized = testName.toLowerCase().replace(/\s+/g, ' ').trim();
  const commercial = nameToCommercial.get(normalized);
  
  if (commercial) {
    console.log(`FOUND: "${testName}" -> ${commercial}`);
  } else {
    // Try partial match
    let partialMatch = '';
    for (const [name, comm] of nameToCommercial.entries()) {
      if (name.includes(normalized.split(',')[0].split(' ')[0])) {
        partialMatch = `${name} -> ${comm}`;
        break;
      }
    }
    console.log(`NOT FOUND: "${testName}" | Partial: ${partialMatch || 'none'}`);
  }
}
