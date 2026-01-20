const fs = require('fs');
const CSV_PATH = 'C:\\Users\\ferna\\Downloads\\Dashboard_Merged_Final_CLEANED.csv';

function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = [];
        let inQuote = false, cell = '';
        for (let c of lines[i]) {
            if (c === '"') inQuote = !inQuote;
            else if (c === ',' && !inQuote) { row.push(cell.trim()); cell = ''; }
            else cell += c;
        }
        row.push(cell.trim());
        const obj = {};
        headers.forEach((h, idx) => obj[h] = row[idx] || '');
        result.push(obj);
    }
    return result;
}

const records = parseCSV(fs.readFileSync(CSV_PATH, 'utf-8'));

// Group by name
const byName = {};
records.forEach(r => {
    const name = r['Nome Leads'];
    if (!name) return;
    if (!byName[name]) byName[name] = [];
    byName[name].push(r);
});

// Find duplicates
const dupes = Object.entries(byName).filter(([k,v]) => v.length > 1);

console.log('=== ANALYZING DUPLICATES ===\n');

let sameCourse = 0;
let diffCourse = 0;
const trueDuplicates = [];

dupes.forEach(([name, entries]) => {
    const courses = entries.map(e => e['Corso']);
    const uniqueCourses = [...new Set(courses)];
    
    if (uniqueCourses.length === 1) {
        // Same course = true duplicate
        sameCourse++;
        trueDuplicates.push({ name, entries, course: uniqueCourses[0] });
    } else {
        // Different courses = student enrolled in multiple courses (legitimate)
        diffCourse++;
    }
});

console.log('Students in SAME course multiple times (TRUE DUPLICATES):', sameCourse);
console.log('Students in DIFFERENT courses (LEGITIMATE):', diffCourse);
console.log('');

if (trueDuplicates.length > 0) {
    console.log('=== TRUE DUPLICATES (same name, same course) ===\n');
    trueDuplicates.forEach(({name, entries, course}) => {
        console.log(`${name} | ${course}`);
        entries.forEach(e => {
            console.log(`   - Date: ${e['Data']} | Iscritto: ${e['Iscrizioni']} | Contattato: ${e['Contattati']} | Ricavi: ${e['Ricavi']}`);
        });
        console.log('');
    });
}
