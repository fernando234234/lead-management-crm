import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EXCEL_PATH = 'C:\\Users\\ferna\\Downloads\\Dashboard_Commerciale_FIXED.xlsx';

function normalize(str: string): string {
  return str?.trim().toLowerCase() || '';
}

// Same mapping as import-missing-leads to ensure consistency
const COURSE_ALIASES: Record<string, string> = {
  'blender / 3d': 'blender 3d',
  '3d modeling/blender / 3d': 'blender 3d',
  'mastering blender / 3d': 'mastering blender',
  '3d modeling': 'modellazione 3d',
  '3d mod.': 'modellazione 3d',
  'bender': 'blender 3d',
  'masterclass graphic & web design': 'masterclass graphic web design',
  'masterclass graphic e web': 'masterclass graphic web design',
  'master in graphic web design': 'masterclass graphic web design',
  'master graphic design': 'masterclass graphic web design',
  'master in graphic design': 'graphic design',
  'grafica': 'graphic design',
  'master grafica': 'masterclass graphic web design',
  'master graf.': 'masterclass graphic web design',
  'master graphi e web': 'masterclass graphic web design',
  'msaster graphic e web': 'masterclass graphic web design',
  'masterc graphic e web': 'masterclass graphic web design',
  'mastergraphic design e web': 'masterclass graphic web design',
  'grafica e master': 'masterclass graphic web design',
  'masterclass graphic e design': 'masterclass graphic web design',
  'masterclass in game design': 'masterclass game design',
  'master game': 'masterclass game design',
  'game ': 'game design',
  'corso game': 'game design',
  'corso game design': 'game design',
  'maste game design': 'masterclass game design',
  'master web development masterclass full developer': 'masterclass full developer',
  'masterclass full developer developer': 'masterclass full developer',
  'masterclass full developer devel.': 'masterclass full developer',
  'master masterclass full developer': 'masterclass full developer',
  'mastermasterclass full developer': 'masterclass full developer',
  'web developer': 'web development',
  'programmazione': 'python', 
  'masterclass ai arts': 'masterclass ai',
  'master in masterclass ai': 'masterclass ai',
  'mastermasterclass ai': 'masterclass ai',
  'modulo masterclass ai': 'masterclass ai',
  'digital mkt': 'digital marketing',
  'digital publ.': 'digital publishing',
  'digital publi.': 'digital publishing',
  'digital publis.': 'digital publishing',
  'social media manager manager': 'social media manager',
  'social media manager menager': 'social media manager',
  'interior planer': 'interior planner',
  'interior design': 'interior planner',
  'interior': 'interior planner',
  'architectural design': 'masterclass architectural design',
  'master architectural': 'masterclass architectural design',
  'master archit. design': 'masterclass architectural design',
  'master architettura': 'masterclass architectural design',
  'm. architettura': 'masterclass architectural design',
  'ux': 'ux/ui design',
  'user interface': 'ux/ui design',
  'user interface design': 'ux/ui design',
  'user inteface design': 'ux/ui design',
  'user experience design': 'ux/ui design',
  'ui': 'ux/ui design',
  'visual design': 'graphic design',
  'visual': 'graphic design',
  'logo': 'logo design',
  'certificazione': 'certificazione adobe',
  'cert adobe': 'certificazione adobe',
  '(cert adobe)': 'certificazione adobe',
  'copywriting': 'copywriting',
  'corso copywriting': 'copywriting',
  'corso cyber security': 'cyber security',
  'cyber securit': 'cyber security',
  'security': 'cyber security',
  'illustrazione': 'illustrazione digitale',
  'illustrazione applicata': 'illustrazione digitale',
  'narrative': 'narrative design',
  'corso narrative': 'narrative design',
  'character design design': 'character design',
  'ccharacter design design': 'character design',
  'corso character design': 'character design',
  
  // New Mappings from Cleanup
  'master graphic': 'masterclass graphic web design',
  'masterclass graphic': 'masterclass graphic web design',
  'corso user experience d./ux': 'ux/ui design',
  'graphic design / masterclass ai': 'masterclass graphic web design', // Primary
  'ui, ux, masterclass ai': 'ux/ui design',
  'corso illustrator/grafic pro': 'graphic design',
  'ps': 'photoshop',
  'phot.': 'photoshop',
  'photo.': 'photoshop',
  'photoshop + web': 'photoshop',
  'css3': 'web development',
  'html': 'web development',
  'rhi. gold': 'rhinoceros',
  'rhi.': 'rhinoceros',
  'rhino.': 'rhinoceros',
  'rhino. gold': 'rhinoceros',
  'charater design': 'character design',
  'char. des.': 'character design',
  'prog mecc': 'progettazione meccanica',
  'prog. mecc.': 'progettazione meccanica',
  'programmazione mecc': 'progettazione meccanica',
  'indesign': 'digital publishing',
  'grassh.': 'rhinoceros',
  'da vinci': 'premiere/davinci',
  'davinci': 'premiere/davinci',
  'zbrush': 'modellazione 3d',
  'bim': 'revit',
  'c++': 'python', // Mapping to generic coding course available
  'c#': 'python',
  'excel': 'excel avanzato',
  'exc': 'excel avanzato',
  'copy.': 'copywriting',
  'copywrting': 'copywriting',
  'illustr.': 'illustrator',
  'illustrazioine': 'illustrazione digitale',
  'm graphica': 'graphic design',
  'gafica': 'graphic design',
  'ia': 'masterclass ai',
  'social': 'social media manager',
  'creo': 'progettazione meccanica', // PTC Creo
  'iul': 'altro',
  'undefined': 'altro',
  '': 'altro'
};

async function main() {
  console.log('🚀 Extracting and Normalizing Courses...');

  // 1. Load Excel
  const workbook = XLSX.readFile(EXCEL_PATH);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
  console.log(`📊 Excel: ${rows.length} rows`);

  // 2. Extract Unique Courses from Excel
  const excelCourses = new Set<string>();
  rows.forEach(row => {
    const raw = row['Corso'];
    if (!raw) return;
    
    let name = normalize(raw);
    if (COURSE_ALIASES[name]) {
      name = COURSE_ALIASES[name];
    }
    
    if (name && name !== 'altro' && name !== 'undefined') {
      // Capitalize properly for display
      const display = name.split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      excelCourses.add(display);
    }
  });

  console.log(`Found ${excelCourses.size} unique normalized courses in Excel.`);

  // 3. Load DB Courses
  const dbCourses = await prisma.course.findMany();
  const dbCourseNames = new Set(dbCourses.map(c => normalize(c.name)));

  // 4. Find Missing
  const missingCourses = Array.from(excelCourses).filter(c => !dbCourseNames.has(normalize(c)));

  console.log(`❌ Missing Courses: ${missingCourses.length}`);
  
  if (missingCourses.length > 0) {
    console.log('Creating missing courses...');
    for (const name of missingCourses) {
      await prisma.course.create({
        data: {
          name: name,
          price: 500, // Default price, needs manual update later
          active: true
        }
      });
      console.log(`+ Created: ${name}`);
    }
  } else {
    console.log('✨ All courses already exist.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
