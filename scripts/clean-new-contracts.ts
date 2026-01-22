import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';

// Load new contracts file
const workbook = XLSX.readFile('C:/Users/ferna/Desktop/EastSIde-Project/v3/IMMAGINI ORIGINALI/Contratti  JfContract (6).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

// Skip header row and map to proper columns
const rows = rawRows.slice(1).map(row => ({
  Studente: (row['Contratti | JfContract'] || '').toString().trim(),
  Corso_Originale: (row['__EMPTY'] || '').toString().trim(),
  DataInizio: row['__EMPTY_1'] || '',
  Docenti: row['__EMPTY_2'] || '',
  NumeroRate: row['__EMPTY_3'] || '',
  StatoPagamenti: row['__EMPTY_4'] || '',
  Commerciale: (row['__EMPTY_5'] || '').toString().trim(),
  DataStipula: row['__EMPTY_6'] || '',
  ContrattoFirmato: row['__EMPTY_7'] || '',
  Note: row['__EMPTY_8'] || ''
})).filter(r => r.Studente && r.Studente !== 'Studente');

console.log('Total rows after cleanup:', rows.length);

// Normalize course names (same rules as original CSV cleanup)
function normalizeCourse(corso: string): string {
  const c = corso.toLowerCase();
  
  // Masterclass courses
  if (c.includes('masterclass graphic') || c.includes('masterclass web design')) {
    return 'Masterclass Graphic Web Design';
  }
  if (c.includes('masterclass ai') || c.includes('ai masterclass')) {
    return 'Masterclass Ai';
  }
  if (c.includes('masterclass game')) {
    return 'Masterclass in Game Design';
  }
  if (c.includes('masterclass architect') || c.includes('masterclass architct')) {
    return 'Masterclass Architectural Design';
  }
  if (c.includes('masterclass') && c.includes('full') && c.includes('developer')) {
    return 'Masterclass Full Developer';
  }
  if (c.includes('masterclass') && c.includes('web') && c.includes('developer')) {
    return 'Masterclass Web Developer Full Stack';
  }
  
  // Regular courses
  if (c.includes('social media')) {
    return 'Social Media Manager';
  }
  if (c.includes('grafica pubblicitaria')) {
    return 'Graphic Design';
  }
  if (c.includes('graphic design') && !c.includes('masterclass') && !c.includes('web')) {
    return 'Graphic Design';
  }
  if (c.includes('interior')) {
    return 'Interior Planner';
  }
  if (c.includes('brand')) {
    return 'Brand Communication';
  }
  if (c.includes('blender')) {
    return 'Blender / 3D';
  }
  if (c.includes('3d') && !c.includes('masterclass')) {
    return 'Blender / 3D';
  }
  if (c.includes('attività individuale') || c.includes('attivita individuale')) {
    return 'Attività Individuale';
  }
  if (c.includes('user experience') || c.includes('ux design') || 
      c.includes('user interface') || c.includes('ui design') ||
      c.includes('ux/ui') || c.includes('ux ui')) {
    return 'UX/UI Design';
  }
  if (c.includes('narrative')) {
    return 'Narrative Design';
  }
  if (c.includes('character')) {
    return 'Character Design';
  }
  if (c.includes('motion')) {
    return 'Motion Design';
  }
  if (c.includes('revit')) {
    return 'Revit';
  }
  if (c.includes('autocad')) {
    return 'Autocad';
  }
  if (c.includes('catia')) {
    return 'Catia';
  }
  if (c.includes('excel')) {
    return 'Excel';
  }
  if (c.includes('project management') || c.includes('microsoft project')) {
    return 'Project Management Professional';
  }
  if (c.includes('illustrazione digitale') || c.includes('digital illustration')) {
    return 'Illustrazione Digitale';
  }
  if (c.includes('digital publishing')) {
    return 'Digital Publishing';
  }
  if (c.includes('logo design')) {
    return 'Logo Design';
  }
  if (c.includes('photoshop')) {
    return 'Photoshop';
  }
  if (c.includes('zbrush')) {
    return 'ZBrush';
  }
  if (c.includes('game design') && !c.includes('masterclass')) {
    return 'Game Design';
  }
  if (c.includes('concept art')) {
    return 'Concept Art';
  }
  if (c.includes('web design') && !c.includes('graphic') && !c.includes('masterclass')) {
    return 'Web Design';
  }
  if (c.includes('digital marketing')) {
    return 'Digital marketing';
  }
  if (c.includes('tipografia') || c.includes('typography') || c.includes('comandamenti')) {
    return 'Graphic Design';  // Typography is part of graphic design
  }
  
  // Return original if no match
  return corso;
}

// Add normalized course
const cleanedRows = rows.map(r => ({
  ...r,
  Corso: normalizeCourse(r.Corso_Originale)
}));

// Write to CSV
const headers = ['Studente', 'Corso', 'Corso_Originale', 'Commerciale', 'DataInizio', 'DataStipula', 'NumeroRate', 'StatoPagamenti'];
const csvLines = [
  headers.join(','),
  ...cleanedRows.map(r => headers.map(h => {
    const val = String((r as any)[h] || '');
    // Escape commas and quotes
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }).join(','))
];

const outputPath = 'C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv';
writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');

console.log(`\nCleaned CSV written to: ${outputPath}`);

// Show course distribution
const courseCount = cleanedRows.reduce((acc, r) => {
  acc[r.Corso] = (acc[r.Corso] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('\n--- Course Distribution ---');
Object.entries(courseCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([course, count]) => console.log(`${course}: ${count}`));
