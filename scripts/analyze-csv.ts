import * as fs from 'fs';

const csvPath = 'C:\\Users\\ferna\\Downloads\\Dashboard_Commerciale_Formazione (4) - Dati (1).csv';
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n').filter(l => l.trim() && !l.match(/^,+0?$/));

console.log('=== CSV ANALYSIS ===\n');
console.log('Total rows (excluding empty):', lines.length - 1);

// Parse header
const header = lines[0].split(',');
console.log('\nColumns:', header);

// Analyze data
const commercials = new Map<string, { leads: number; enrolled: number; revenue: number; contacted: number }>();
const courses = new Map<string, { leads: number; enrolled: number; revenue: number }>();
const courseVariations = new Map<string, string[]>(); // normalized -> variations

let totalRevenue = 0;
let totalSpend = 0;
let enrolledCount = 0;
let contactedCount = 0;

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 13) continue;
  
  const commercial = (cols[2] || '').trim();
  const course = (cols[3] || '').trim();
  const contattati = (cols[8] || '').trim().toUpperCase();
  const iscrizioni = (cols[10] || '').trim().toUpperCase();
  const spesa = parseFloat(cols[11]) || 0;
  const ricavi = parseFloat(cols[12]) || 0;
  
  // Track commercial stats
  if (commercial) {
    if (!commercials.has(commercial)) {
      commercials.set(commercial, { leads: 0, enrolled: 0, revenue: 0, contacted: 0 });
    }
    const c = commercials.get(commercial)!;
    c.leads++;
    if (iscrizioni === 'SI') c.enrolled++;
    if (contattati === 'SI') c.contacted++;
    c.revenue += ricavi;
  }
  
  // Track course stats
  if (course) {
    const normalizedCourse = course.toLowerCase().trim();
    if (!courseVariations.has(normalizedCourse)) {
      courseVariations.set(normalizedCourse, []);
    }
    if (!courseVariations.get(normalizedCourse)!.includes(course)) {
      courseVariations.get(normalizedCourse)!.push(course);
    }
    
    if (!courses.has(course)) {
      courses.set(course, { leads: 0, enrolled: 0, revenue: 0 });
    }
    const co = courses.get(course)!;
    co.leads++;
    if (iscrizioni === 'SI') co.enrolled++;
    co.revenue += ricavi;
  }
  
  if (iscrizioni === 'SI') enrolledCount++;
  if (contattati === 'SI') contactedCount++;
  totalRevenue += ricavi;
  totalSpend += spesa;
}

console.log('\n========================================');
console.log('=== COMMERCIALS ===');
console.log('========================================');
Array.from(commercials.entries())
  .sort((a, b) => b[1].leads - a[1].leads)
  .forEach(([name, stats]) => {
    const convRate = stats.leads > 0 ? ((stats.enrolled / stats.leads) * 100).toFixed(1) : '0';
    console.log(`${name.padEnd(15)} | ${String(stats.leads).padStart(5)} leads | ${String(stats.contacted).padStart(5)} contacted | ${String(stats.enrolled).padStart(4)} enrolled (${convRate}%) | €${stats.revenue}`);
  });

console.log('\n========================================');
console.log('=== COURSES (All unique) ===');
console.log('========================================');
Array.from(courses.entries())
  .sort((a, b) => b[1].leads - a[1].leads)
  .forEach(([name, stats]) => {
    console.log(`${name.substring(0,40).padEnd(42)} | ${String(stats.leads).padStart(5)} leads | ${String(stats.enrolled).padStart(4)} enrolled | €${stats.revenue}`);
  });

console.log('\n========================================');
console.log('=== COURSE NAME VARIATIONS (potential duplicates) ===');
console.log('========================================');
Array.from(courseVariations.entries())
  .filter(([_, variations]) => variations.length > 1)
  .forEach(([normalized, variations]: [string, string[]]) => {
    console.log(`"${normalized}" has variations:`);
    variations.forEach((v: string) => console.log(`  - "${v}"`));
  });

console.log('\n========================================');
console.log('=== TOTALS ===');
console.log('========================================');
console.log('Total leads:', lines.length - 1);
console.log('Total contacted:', contactedCount);
console.log('Total enrolled:', enrolledCount);
console.log('Conversion rate:', ((enrolledCount / (lines.length - 1)) * 100).toFixed(2) + '%');
console.log('Total revenue: €' + totalRevenue);
console.log('Total ad spend: €' + totalSpend);
console.log('ROI:', totalSpend > 0 ? (((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(1) + '%' : 'N/A (no spend tracked)');
