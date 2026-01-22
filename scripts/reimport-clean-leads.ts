/**
 * CLEAN LEAD REIMPORT SCRIPT
 * ==========================
 * 
 * Reimports leads from the CLEANED CSV with normalized course names.
 * 
 * SOURCE: Dashboard_Merged_Final_CLEANED.csv (6,590 leads, 36 courses)
 * 
 * WHAT THIS SCRIPT DOES:
 * ----------------------
 * 1. Deletes ALL leads
 * 2. Deletes ALL courses
 * 3. Creates fresh courses from CSV (36 clean courses)
 * 4. Imports leads with proper assignments
 * 5. Marks enrolled leads based on contracts CSV
 * 
 * USAGE:
 * ------
 * npx tsx scripts/reimport-clean-leads.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

// Clean leads CSV
const LEADS_CSV = String.raw`C:\Users\ferna\Downloads\Dashboard_Merged_Final_CLEANED.csv`;
// Contracts CSV for enrollment status
const CONTRACTS_CSV = String.raw`C:\Users\ferna\Downloads\Contratti_VALID_485.csv`;

/**
 * Parse CSV handling quoted fields AND multiline values
 */
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
      if (inQuote && nextChar === '"') {
        // Escaped quote ""
        currentCell += '"';
        i++; // Skip next quote
      } else {
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuote) {
      // End of row
      if (char === '\r') i++; // Skip \n in \r\n
      
      currentRow.push(currentCell.trim());
      currentCell = '';
      
      if (isFirstRow) {
        headers = currentRow;
        isFirstRow = false;
      } else if (currentRow.some(c => c)) { // Skip empty rows
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => { obj[h] = currentRow[idx] || ''; });
        result.push(obj);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }
  
  // Handle last row if no trailing newline
  if (currentRow.length > 0 || currentCell) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c)) {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = currentRow[idx] || ''; });
      result.push(obj);
    }
  }
  
  return result;
}

/**
 * Parse DD/MM/YYYY or other date formats
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const trimmed = dateStr.trim();
  
  // Try DD/MM/YYYY format
  const slashParts = trimmed.split('/');
  if (slashParts.length === 3) {
    const [day, month, year] = slashParts;
    if (/^\d{1,2}$/.test(day) && /^\d{1,2}$/.test(month) && /^\d{4}$/.test(year)) {
      const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  
  // Try "03 sett 2025" format
  const monthMap: Record<string, string> = {
    'gen': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'mag': '05', 'giu': '06', 'lug': '07', 'ago': '08',
    'sett': '09', 'ott': '10', 'nov': '11', 'dic': '12',
    'set': '09'
  };
  
  const match = trimmed.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
  if (match) {
    const [, day, monthStr, year] = match;
    const month = monthMap[monthStr.toLowerCase()];
    if (month) {
      const parsed = new Date(`${year}-${month}-${day.padStart(2, '0')}T00:00:00`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  
  return null;
}

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Course equivalence - maps variant names to canonical course name
 * Used to match contracts to leads when course names differ slightly
 */
const COURSE_EQUIVALENCE: Record<string, string[]> = {
  'blender / 3d': ['mastering blender', '3d modeling'],
};

function getEquivalentCourses(course: string): string[] {
  const normalized = normalize(course);
  
  // Check if this course is a canonical name
  if (COURSE_EQUIVALENCE[normalized]) {
    return [normalized, ...COURSE_EQUIVALENCE[normalized]];
  }
  
  // Check if this course is a variant
  for (const [canonical, variants] of Object.entries(COURSE_EQUIVALENCE)) {
    if (variants.includes(normalized)) {
      return [canonical, ...variants];
    }
  }
  
  return [normalized];
}

async function main() {
  console.log('='.repeat(60));
  console.log('CLEAN LEAD REIMPORT SCRIPT');
  console.log('='.repeat(60));

  // Verify files exist
  if (!fs.existsSync(LEADS_CSV)) {
    console.error(`ERROR: Leads CSV not found: ${LEADS_CSV}`);
    process.exit(1);
  }
  if (!fs.existsSync(CONTRACTS_CSV)) {
    console.error(`ERROR: Contracts CSV not found: ${CONTRACTS_CSV}`);
    process.exit(1);
  }

  // Load CSVs
  const leadsRecords = parseCSV(fs.readFileSync(LEADS_CSV, 'utf-8'));
  const contractsRecords = parseCSV(fs.readFileSync(CONTRACTS_CSV, 'utf-8'));
  
  console.log(`\nLoaded ${leadsRecords.length} leads from cleaned CSV`);
  console.log(`Loaded ${contractsRecords.length} contracts\n`);

  // === STEP 1: Delete all leads ===
  console.log('[1/5] Deleting all leads...');
  const deletedLeads = await prisma.lead.deleteMany();
  console.log(`      Deleted ${deletedLeads.count} leads\n`);

  // === STEP 2: Delete all courses ===
  console.log('[2/5] Deleting all courses...');
  const deletedCourses = await prisma.course.deleteMany();
  console.log(`      Deleted ${deletedCourses.count} courses\n`);

  // === STEP 3: Create fresh courses ===
  console.log('[3/5] Creating fresh courses...');
  
  // Get unique courses from cleaned CSV
  const uniqueCourses = new Set<string>();
  for (const row of leadsRecords) {
    const courseName = row['Corso']?.trim();
    if (courseName) uniqueCourses.add(courseName);
  }
  
  // Also add any courses from contracts that might be missing
  for (const row of contractsRecords) {
    const courseName = row['Corso']?.trim();
    if (courseName) uniqueCourses.add(courseName);
  }
  
  // Course prices from contracts
  const coursePrices: Record<string, number> = {};
  for (const row of contractsRecords) {
    const courseName = row['Corso']?.trim();
    const price = parseFloat(row['Prezzo medio (€)']) || 0;
    if (courseName && price > 0) {
      coursePrices[courseName] = price;
    }
  }
  
  const courseMap = new Map<string, string>(); // normalized name -> id
  
  for (const courseName of Array.from(uniqueCourses).sort()) {
    const price = coursePrices[courseName] || 0;
    const course = await prisma.course.create({
      data: { name: courseName, price, active: true }
    });
    courseMap.set(normalize(courseName), course.id);
  }
  
  console.log(`      Created ${courseMap.size} courses\n`);

  // === STEP 4: Load users ===
  console.log('[4/5] Loading users...');
  const users = await prisma.user.findMany();
  const adminUser = users.find(u => u.role === 'ADMIN') || users[0];
  
  const userByFirstName = new Map<string, string>();
  for (const user of users) {
    const firstName = normalize(user.name.split(' ')[0]);
    userByFirstName.set(firstName, user.id);
  }
  
  console.log(`      Found ${users.length} users\n`);

  // === STEP 5: Import leads ===
  console.log('[5/6] Importing leads from CSV...');
  
  // Build enrollment lookup: "name|course" -> contract data
  // Contracts CSV columns: Studente, Corso, DataStipula
  // Also store original contract data for later use
  const enrollmentLookup = new Map<string, { date: Date | null, course: string, commerciale: string }>();
  const allContracts: { name: string, course: string, date: Date | null, commerciale: string }[] = [];
  
  for (const row of contractsRecords) {
    const name = row['Studente']?.trim();
    const course = row['Corso']?.trim();
    const date = parseDate(row['DataStipula']);
    const commerciale = row['Commerciale']?.trim() || '';
    if (name && course) {
      enrollmentLookup.set(`${normalize(name)}|${normalize(course)}`, { date, course, commerciale });
      allContracts.push({ name, course, date, commerciale });
    }
  }
  console.log(`      Built enrollment lookup with ${enrollmentLookup.size} entries\n`);
  
  const stats = {
    imported: 0,
    skippedNoName: 0,
    skippedNoCourse: 0,
    enrolled: 0,
    contacted: 0,
    nuovo: 0,
    userMatched: 0,
    userFallback: 0
  };

  const batchSize = 500;
  let batch: any[] = [];

  for (const row of leadsRecords) {
    const name = row['Nome Leads']?.trim();
    if (!name) {
      stats.skippedNoName++;
      continue;
    }

    const courseName = row['Corso']?.trim();
    if (!courseName) {
      stats.skippedNoCourse++;
      continue;
    }

    const courseId = courseMap.get(normalize(courseName));
    if (!courseId) {
      stats.skippedNoCourse++;
      continue;
    }

    // Match commercial to user
    let assignedToId = adminUser.id;
    const commercialName = row['Commerciale']?.trim();
    
    if (commercialName) {
      // Try first name match (most reliable for this data)
      const firstName = normalize(commercialName.split(' ')[0]);
      if (userByFirstName.has(firstName)) {
        assignedToId = userByFirstName.get(firstName)!;
        stats.userMatched++;
      } else {
        stats.userFallback++;
      }
    } else {
      stats.userFallback++;
    }

    // Determine enrollment status from contracts
    // Only mark ONE lead per name+course as enrolled (remove from lookup after use)
    // Also check course equivalents (e.g., "Mastering Blender" matches "Blender / 3D")
    const normalizedName = normalize(name);
    const equivalentCourses = getEquivalentCourses(courseName);
    
    let enrollmentData: { date: Date | null, course: string, commerciale: string } | undefined;
    let matchedKey: string | undefined;
    
    for (const eqCourse of equivalentCourses) {
      const key = `${normalizedName}|${eqCourse}`;
      if (enrollmentLookup.has(key)) {
        enrollmentData = enrollmentLookup.get(key);
        matchedKey = key;
        break;
      }
    }
    
    const isEnrolled = !!enrollmentData;
    if (isEnrolled && matchedKey) {
      enrollmentLookup.delete(matchedKey); // Prevent duplicate enrollments
    }
    
    // Determine contacted status
    const leadValidi = row['Lead Validi']?.trim().toUpperCase();
    const contattati = row['Contattati']?.trim().toUpperCase();
    const isContacted = leadValidi === 'SI' || contattati === 'SI' || 
                       ['SI', 'NO', 'INFO MAIL', 'INFO VIA MAIL', 'DA RICHIAMARE', 'IN TARG', 'N. FAKE', 'NO RISP'].includes(contattati);

    // Determine status
    let status: 'NUOVO' | 'CONTATTATO' | 'ISCRITTO' = 'NUOVO';
    if (isEnrolled) {
      status = 'ISCRITTO';
      stats.enrolled++;
    } else if (isContacted) {
      status = 'CONTATTATO';
      stats.contacted++;
    } else {
      stats.nuovo++;
    }

    // Parse date
    const createdAt = parseDate(row['Data']) || new Date();

    // Parse revenue
    const revenue = parseFloat(row['Ricavi']?.replace(',', '.')) || 0;

    batch.push({
      name,
      courseId,
      assignedToId,
      createdById: adminUser.id,
      createdAt,
      updatedAt: createdAt,
      enrolled: isEnrolled,
      enrolledAt: isEnrolled ? (enrollmentData?.date || createdAt) : null,
      contacted: isContacted,
      contactedAt: isContacted ? createdAt : null,
      isTarget: leadValidi === 'SI',
      revenue,
      source: 'LEGACY_IMPORT',
      notes: null,
      status
    });

    if (batch.length >= batchSize) {
      await prisma.lead.createMany({ data: batch });
      stats.imported += batch.length;
      process.stdout.write(`\r      Imported ${stats.imported} leads...`);
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    await prisma.lead.createMany({ data: batch });
    stats.imported += batch.length;
  }

  console.log(`\r      Imported ${stats.imported} leads          \n`);

  // === STEP 6: Add missing leads for unmatched contracts ===
  console.log('[6/6] Adding leads for unmatched contracts...');
  
  // Find contracts that weren't matched (still in enrollmentLookup)
  // These need new leads created
  let addedFromContracts = 0;
  
  for (const contract of allContracts) {
    const normalizedName = normalize(contract.name);
    const equivalentCourses = getEquivalentCourses(contract.course);
    
    // Check if any equivalent course key still exists in lookup
    let stillUnmatched = false;
    for (const eqCourse of equivalentCourses) {
      const key = `${normalizedName}|${eqCourse}`;
      if (enrollmentLookup.has(key)) {
        stillUnmatched = true;
        enrollmentLookup.delete(key); // Mark as processed
        break;
      }
    }
    
    if (stillUnmatched) {
      // Get courseId - use exact contract course name
      let courseId = courseMap.get(normalize(contract.course));
      
      if (!courseId) {
        // Course doesn't exist, create it
        const newCourse = await prisma.course.create({
          data: { name: contract.course, price: 0, active: true }
        });
        courseId = newCourse.id;
        courseMap.set(normalize(contract.course), courseId);
      }
      
      // Match commercial to user
      let assignedToId = adminUser.id;
      if (contract.commerciale) {
        const firstName = normalize(contract.commerciale.split(' ')[0]);
        if (userByFirstName.has(firstName)) {
          assignedToId = userByFirstName.get(firstName)!;
        }
      }
      
      // Create the lead as ISCRITTO
      await prisma.lead.create({
        data: {
          name: contract.name,
          courseId,
          assignedToId,
          createdById: adminUser.id,
          createdAt: contract.date || new Date(),
          updatedAt: contract.date || new Date(),
          enrolled: true,
          enrolledAt: contract.date || new Date(),
          contacted: true,
          contactedAt: contract.date || new Date(),
          isTarget: true,
          revenue: 0,
          source: 'LEGACY_IMPORT',
          notes: 'Added from contracts - no matching lead in CSV',
          status: 'ISCRITTO'
        }
      });
      
      addedFromContracts++;
      stats.enrolled++;
    }
  }
  
  console.log(`      Added ${addedFromContracts} leads from unmatched contracts\n`);

  // === SUMMARY ===
  console.log('='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`
  Leads imported:     ${stats.imported}
  Skipped (no name):  ${stats.skippedNoName}
  Skipped (no course):${stats.skippedNoCourse}
  
  Status breakdown:
    ISCRITTO:         ${stats.enrolled}
    CONTATTATO:       ${stats.contacted}
    NUOVO:            ${stats.nuovo}
  
  User matching:
    Matched:          ${stats.userMatched}
    Fallback (Admin): ${stats.userFallback}
  
  Courses created:    ${courseMap.size}
  `);

  // Verify final counts
  const finalLeads = await prisma.lead.count();
  const finalCourses = await prisma.course.count();
  const finalEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  
  console.log('VERIFICATION:');
  console.log(`  Total leads:       ${finalLeads}`);
  console.log(`  Total courses:     ${finalCourses}`);
  console.log(`  Enrolled (ISCRITTO): ${finalEnrolled}`);
}

main()
  .catch(e => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
