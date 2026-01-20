const fs = require('fs');
const CSV_PATH = 'C:\\Users\\ferna\\Downloads\\Dashboard_Merged_Final_CLEANED.csv';

const text = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = text.split(/\r?\n/);
const headers = lines[0].split(',').map(h => h.trim());
const nameIdx = headers.indexOf('Nome Leads');

const names = [];
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
    if (row[nameIdx]) names.push(row[nameIdx]);
}

const counts = {};
names.forEach(n => counts[n] = (counts[n] || 0) + 1);
const dupes = Object.entries(counts).filter(([k,v]) => v > 1).sort((a,b) => b[1] - a[1]);

console.log('Total records:', names.length);
console.log('Unique names:', Object.keys(counts).length);
console.log('Names appearing more than once:', dupes.length);
console.log('');
if (dupes.length > 0) {
    console.log('=== DUPLICATE NAMES ===');
    dupes.forEach(([name, count]) => console.log(count + 'x  ' + name));
} else {
    console.log('✅ No duplicate names found!');
}
