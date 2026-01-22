/**
 * COURSE NORMALIZATION SCRIPT
 * ===========================
 * 
 * Merges duplicate course names into canonical versions.
 * - Moves all leads from duplicate courses to the canonical course
 * - Deletes empty duplicate courses
 * 
 * USAGE:
 * ------
 * npx tsx scripts/normalize-courses.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Canonical course names and their variants
const COURSE_MAPPINGS: Record<string, string[]> = {
  // === MASTERCLASS COURSES ===
  'Masterclass Graphic Web Design': [
    'Masteclass Graphic Web Design',
    'Masterclass Graphic e Design',
    'Masterclass Graphic e web design',
    'Masterclass Graphic Web Design/Social Media Manager/copy',
    'Masterclass Graphic Web Design& web',
    'Masterclass Graphic Web Design+ promo',
    'Masterclass Graphic Web Design+promo',
    'Masterclass Graphic Web Designa',
    'Masterclass Graphic Web Designlive',
    'master  Graphic',
    'master Graphic design',
    'master Graphic design nn risp',
    'master graf.',
    'master in Game',
    'master in grapfic e web design',
    'master in grapfica',
    'Master in graphi e web',
    'Master in graphic',
    'master in Graphic design',
    'Master in graphic e web design',
    'master in Graphica',
    'master in graphica e web',
    'masterin Graphic e web design',
    'M Graphica',
    'graphic web design',
    'Graphic Design/ Master',
  ],
  
  'Masterclass Ai': [
    'ia',
    'Master in Masterclass Ai',
    'mastera Masterclass Ai',
    'Masterc Masterclass Ai',
    'midjourney',
  ],
  
  'Masterclass Architectural Design': [
    'master ach.',
    'master Arch',
    'master archit. design',
    'master architectural',
    'Master architettura',
    'Master Architettura Design',
    'Master Archittetura',
    'M. Architettura',
    'ach. design',
    'arch. design',
    'architectural',
    'master in Masterclass Architectural Design',
  ],
  
  'Masterclass Full Developer': [
    'Masterclass Full Developer stack Dev.',
    'MasterMasterclass Full Developer',
    'master web developer',
    'Masterclass Web Developer',
  ],
  
  'Masterclass Game Design': [
    'Masterclass in game design design',
    'Maste Game',
    'master fame',
    'laurea game',
    'laurea videogames',
  ],
  
  // === DESIGN COURSES ===
  'Graphic Design': [
    'Graphic Design design',
    'gafica',
    'Corso Graphic Design',
  ],
  
  'Character Design': [
    'char. des.',
    'CCharacter Design Designe design',
    'corso Character Design',
  ],
  
  'Logo Design': [
    'corso Logo Design',
  ],
  
  'Interior Planner': [
    'Interior',
    'Corso Interior',
    'corso interior planner',
  ],
  
  'UX/UI Design': [
    'Ui',
    'Ui / UX/UI Design',
    'ui e UX/UI Design',
    'user ex',
    'user experience design',
    'user interface',
    'User Interface dsign',
    'corso User E',
    'Corso User Ex',
    'corso UX/UI Design',
  ],
  
  'Concept Art': [
    'concept art.',
  ],
  
  // === 3D / MODELING ===
  'Blender / 3D': [
    'bender',
    'Masterin Blender / 3D',
  ],
  
  'Mastering Blender': [],
  
  '3d Modeling': [
    '3d mod.',
    '3d model.',
    'Modellazione 3d',
  ],
  
  '3d Studio Max': [
    '3ds max',
  ],
  
  // === ADOBE / CREATIVE ===
  'After Effects': [
    'afther effects',
    'Corso Abobe Effect',
    'Corso Adobe After Effects',
    'corso after effect',
    'Corso After Effects',
  ],
  
  'Photoshop': [
    'phot.',
    'photo.',
    'corso photoshop',
  ],
  
  'Illustrazione Digitale': [
    'illustr.',
    'illustrator',
    'illustrazioine',
    'adobe illustrator',
    'corso adobe illustrator',
    'corso illustrator',
    'corso illustrazione',
    'corso illustrazione applicata',
    'corso illustrazione Digitale',
    'corso in illustrazione digitale',
  ],
  
  'Certificazione Adobe': [
    '(cert Adobe)',
    'adobe',
    'Cert Adobe',
    'Certificazione',
  ],
  
  'Digital Publishing': [
    'dig. publ.',
    'digital publ.',
    'corso digital publishing',
  ],
  
  // === CAD / ENGINEERING ===
  'Autocad': [
    'Autocad 2/3D',
    'Autocad 2D e 3 D',
    'Autocad 2d e 3d',
    'corso Autocad',
  ],
  
  'Revit': [
    'Revit e Bim',
    'Revit/ master',
    'bim',
  ],
  
  'Rhinoceros': [
    'rhi.',
    'rhi. gold',
    'rhino.',
    'rhino. gold',
  ],
  
  'SolidWorks': [
    'solidw.',
  ],
  
  'Catia': [],
  
  // === MARKETING / BUSINESS ===
  'Digital marketing': [
    'dgt mkt',
    'dig. mkt',
    'corso Digital Marketing',
  ],
  
  'Social Media Manager': [
    'Social',
    'corso Social Media Manager manager',
    'corso Social Media Manager menager',
  ],
  
  'Copywriting': [
    'copy.',
  ],
  
  // === PROGRAMMING ===
  'Python': [],
  
  'Unity': [],
  
  'Game Design': [],
  
  'Cyber Security': [
    'cyber securit',
    'Cyber Securitu',
  ],
  
  'Narrative Design': [
    'narr.',
    'corso Narrative Design',
    'corso in Narrative Designdesign',
  ],
  
  // === VIDEO ===
  'Master Editing Video': [
    'premiere',
    'cinematografia',
    'CinematoGraphic design',
    'corso cinematografia',
    'laurea cinema',
    'da vinci',
  ],
  
  // === OTHER ===
  'Excel': [
    'Exc',
  ],
  
  'Corso progettazione': [
    'corso progettazione',
    'Corso progettazione Meccanica',
    'prog mecc',
    'prog. mecc.',
    'programmazione mecc',
  ],
  
  'Web Development': [
    'web develop.',
    'WEB Master',
    'corso web master',
    'wordpress',
    'HTML',
    'corso html',
    'corso javascript',
    'corso programmazione',
    'programmatore',
    'Programmatore cnc',
    'program. c++',
    'C#',
    'c++',
  ],
  
  'Fotogrammetria 3D': [
    'fotogram.',
    'fotogramm.',
    'Corso fotogramm.light. 3d',
    'corso fotogrammetria 3d',
  ],
  
  'Laurea Arti Digitali': [
    'laurea art. dig.',
    'arti dig.',
    'Laurea in arti digitali specializzazione in Animazione',
    'Percorso universitario',
  ],
  
  'Colorazione Digitale': [
    'color. dig.',
    'colorazione dig.',
  ],
  
  'Figma': [
    'figma',
    'corso figma',
  ],
  
  'Fumetto': [
    'Corso fumetto',
  ],
  
  'Archicad': [
    'archicad',
    'corso archicad',
  ],
  
  'Grasshopper': [
    'grassh.',
  ],
  
  'CAD/CAM': [
    'corso Cad/Cam',
    'creo',
  ],
  
  'Facebook Ads': [
    'fb ads',
  ],
  
  'Big Data': [
    'big data',
  ],
  
  'Zbrush': [],
  
  'InDesign': [
    'indesign',
  ],
  
  'Comunicazione Digitale': [
    'comunicazione digitale',
  ],
};

async function main() {
  console.log('='.repeat(60));
  console.log('COURSE NORMALIZATION SCRIPT');
  console.log('='.repeat(60));
  
  // Get all courses with lead counts
  const courses = await prisma.course.findMany({
    include: { _count: { select: { leads: true } } }
  });
  
  console.log(`\nFound ${courses.length} courses in database\n`);
  
  // Build lookup: lowercase name -> course
  const courseByName = new Map(courses.map(c => [c.name.toLowerCase().trim(), c]));
  
  let mergedCount = 0;
  let leadsMovedCount = 0;
  let deletedCount = 0;
  
  for (const [canonical, variants] of Object.entries(COURSE_MAPPINGS)) {
    // Find or create canonical course
    let canonicalCourse = courseByName.get(canonical.toLowerCase().trim());
    
    if (!canonicalCourse) {
      // Check if it exists with different casing
      const existing = courses.find(c => c.name.toLowerCase().trim() === canonical.toLowerCase().trim());
      if (existing) {
        canonicalCourse = existing;
      } else {
        // Create it if any variants exist
        const hasVariants = variants.some(v => courseByName.has(v.toLowerCase().trim()));
        if (hasVariants) {
          console.log(`Creating canonical course: "${canonical}"`);
          canonicalCourse = await prisma.course.create({
            data: { name: canonical, price: 0, active: true }
          });
        } else {
          continue; // No variants to merge
        }
      }
    }
    
    // Process variants
    for (const variant of variants) {
      const variantCourse = courseByName.get(variant.toLowerCase().trim());
      
      if (variantCourse && variantCourse.id !== canonicalCourse.id) {
        const leadCount = variantCourse._count?.leads || 0;
        
        if (leadCount > 0) {
          // Move leads to canonical course
          await prisma.lead.updateMany({
            where: { courseId: variantCourse.id },
            data: { courseId: canonicalCourse.id }
          });
          leadsMovedCount += leadCount;
          console.log(`  Moved ${leadCount} leads: "${variantCourse.name}" -> "${canonical}"`);
        }
        
        // Delete the variant course
        await prisma.course.delete({ where: { id: variantCourse.id } });
        deletedCount++;
        mergedCount++;
      }
    }
  }
  
  // Clean up courses with 0 leads that aren't canonical
  const emptyCourses = await prisma.course.findMany({
    where: {
      leads: { none: {} }
    }
  });
  
  const canonicalNames = new Set(Object.keys(COURSE_MAPPINGS).map(n => n.toLowerCase().trim()));
  const importantCourses = new Set([
    'attività individuale',
    'brand communication',
    'excel avanzato per business',
    'leadership & management',
    'marketing digitale avanzato',
    'masterclass in game design',
    'project management professional',
    'python per data analysis',
    'tecniche di vendita b2b',
  ]);
  
  for (const course of emptyCourses) {
    const lowerName = course.name.toLowerCase().trim();
    if (!canonicalNames.has(lowerName) && !importantCourses.has(lowerName)) {
      await prisma.course.delete({ where: { id: course.id } });
      deletedCount++;
      console.log(`  Deleted empty course: "${course.name}"`);
    }
  }
  
  // Final count
  const finalCount = await prisma.course.count();
  const finalLeadCount = await prisma.lead.count();
  
  console.log('\n' + '='.repeat(60));
  console.log('NORMALIZATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Courses merged: ${mergedCount}`);
  console.log(`Leads moved: ${leadsMovedCount}`);
  console.log(`Courses deleted: ${deletedCount}`);
  console.log(`\nFinal course count: ${finalCount}`);
  console.log(`Total leads: ${finalLeadCount}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
