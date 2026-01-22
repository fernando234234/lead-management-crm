/**
 * LEAD IMPORT SCRIPT - v2.0
 * =========================
 * 
 * This is the reference import script for the Lead Management CRM.
 * 
 * CSV EXPECTED FORMAT:
 * --------------------
 * Column 0:  Data          - Date (DD/MM/YYYY format)
 * Column 1:  Nome Leads    - Lead name (required)
 * Column 2:  Commerciale   - Sales rep name (matched to users)
 * Column 3:  Corso         - Course name (required, created if missing)
 * Column 4:  Sorgente      - Source (currently ignored - always empty in CSV)
 * Column 5:  Campagna      - Campaign (currently ignored - always empty in CSV)
 * Column 6:  Lead generati - (ignored)
 * Column 7:  Lead Validi   - "SI" = isTarget true
 * Column 8:  Contattati    - "SI" = contacted true
 * Column 9:  Tel x esito   - (ignored)
 * Column 10: Iscrizioni    - "SI" = enrolled true
 * Column 11: Spesa ads     - (IGNORED - this is course-level spend, not per-lead)
 * Column 12: Ricavi        - Revenue amount
 * 
 * WHAT THIS SCRIPT DOES:
 * ----------------------
 * 1. Clears all existing leads
 * 2. Creates missing courses from CSV
 * 3. Matches commercials by name to existing users
 * 4. Imports leads with proper date parsing
 * 5. Sets status based on contacted/enrolled flags
 * 
 * USAGE:
 * ------
 * npx tsx scripts/import-leads.ts
 * 
 * Or with custom CSV path:
 * CSV_PATH="path/to/file.csv" npx tsx scripts/import-leads.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

// Default CSV path - can be overridden with CSV_PATH env var
const CSV_PATH = process.env.CSV_PATH || String.raw`C:\Users\ferna\Downloads\Dashboard_Commerciale_Formazione (4) - Dati (1).csv`;

/**
 * Parse CSV handling quoted fields
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const row: string[] = [];
    let inQuote = false;
    let currentCell = '';
    
    for (const char of lines[i]) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    
    const obj: Record<string, string> = {};
    headers.forEach((h, index) => { obj[h] = row[index] || ''; });
    result.push(obj);
  }
  
  return result;
}

/**
 * Parse DD/MM/YYYY date format
 * Returns null if invalid
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  
  const [day, month, year] = parts;
  
  // Validate parts are numeric
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) {
    return null;
  }
  
  const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
  
  if (isNaN(parsed.getTime())) return null;
  
  return parsed;
}

/**
 * Normalize string for matching (lowercase, trim, remove extra spaces)
 */
function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function main() {
  console.log('='.repeat(60));
  console.log('LEAD IMPORT SCRIPT v2.0');
  console.log('='.repeat(60));
  console.log(`CSV Path: ${CSV_PATH}\n`);

  // Verify file exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(fileContent);
  console.log(`Loaded ${records.length} records from CSV\n`);

  // === STEP 1: Clear existing leads ===
  console.log('[1/5] Clearing existing leads...');
  const deleted = await prisma.lead.deleteMany();
  console.log(`      Deleted ${deleted.count} leads\n`);

  // === STEP 2: Load users for matching ===
  console.log('[2/5] Loading users...');
  const users = await prisma.user.findMany();
  const adminUser = users.find(u => u.role === 'ADMIN') || users[0];
  
  // Create lookup maps
  const userByExactName = new Map(users.map(u => [normalize(u.name), u.id]));
  const userByFirstName = new Map(users.map(u => [normalize(u.name.split(' ')[0]), u.id]));
  
  console.log(`      Found ${users.length} users`);
  console.log(`      Admin fallback: ${adminUser.name}\n`);

  // === STEP 3: Resolve courses ===
  console.log('[3/5] Resolving courses...');
  const existingCourses = await prisma.course.findMany();
  const courseMap = new Map(existingCourses.map(c => [normalize(c.name), c.id]));
  
  const distinctCsvCourses = new Set(
    records
      .map(r => r['Corso']?.trim())
      .filter(Boolean)
  );
  
  let coursesCreated = 0;
  for (const courseName of Array.from(distinctCsvCourses)) {
    if (!courseMap.has(normalize(courseName))) {
      const newCourse = await prisma.course.create({ 
        data: { name: courseName, price: 0, active: true } 
      });
      courseMap.set(normalize(courseName), newCourse.id);
      coursesCreated++;
    }
  }
  
  console.log(`      Existing courses: ${existingCourses.length}`);
  console.log(`      New courses created: ${coursesCreated}\n`);

  // === STEP 4: Prepare leads ===
  console.log('[4/5] Preparing leads...');
  
  interface LeadInsert {
    name: string;
    courseId: string;
    assignedToId: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    enrolled: boolean;
    contacted: boolean;
    isTarget: boolean;
    revenue: number;
    source: 'LEGACY_IMPORT';
    notes: string | null;
    status: 'NUOVO' | 'CONTATTATO' | 'ISCRITTO';
  }
  
  const leadsToInsert: LeadInsert[] = [];
  const stats = {
    skippedNoName: 0,
    skippedNoCourse: 0,
    emptyDate: 0,
    invalidDate: 0,
    userMatched: 0,
    userFallback: 0,
  };

  for (const row of records) {
    // Name is required
    const name = row['Nome Leads']?.trim();
    if (!name) {
      stats.skippedNoName++;
      continue;
    }

    // Course is required
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
      const normalized = normalize(commercialName);
      
      // Try exact match first
      if (userByExactName.has(normalized)) {
        assignedToId = userByExactName.get(normalized)!;
        stats.userMatched++;
      } 
      // Try first name match
      else if (userByFirstName.has(normalized)) {
        assignedToId = userByFirstName.get(normalized)!;
        stats.userMatched++;
      }
      // Try partial match
      else {
        const partial = users.find(u => 
          normalize(u.name).includes(normalized) || 
          normalized.includes(normalize(u.name))
        );
        if (partial) {
          assignedToId = partial.id;
          stats.userMatched++;
        } else {
          stats.userFallback++;
        }
      }
    } else {
      stats.userFallback++;
    }

    // Parse date
    let createdAt = new Date();
    const dateStr = row['Data'];
    
    if (!dateStr) {
      stats.emptyDate++;
    } else {
      const parsed = parseDate(dateStr);
      if (parsed) {
        createdAt = parsed;
      } else {
        stats.invalidDate++;
      }
    }

    // Parse boolean flags
    const isEnrolled = row['Iscrizioni']?.toUpperCase() === 'SI';
    const isContacted = row['Contattati']?.toUpperCase() === 'SI' || isEnrolled;
    const isTarget = row['Lead Validi']?.toUpperCase() === 'SI';

    // Parse revenue (handle Italian number format: 1.234,56)
    let revenue = 0;
    const revenueStr = row['Ricavi'];
    if (revenueStr) {
      // Remove currency symbol and spaces, convert Italian format
      const cleaned = revenueStr
        .replace(/[€\s]/g, '')
        .replace(/\./g, '')  // Remove thousand separators
        .replace(',', '.');   // Convert decimal separator
      revenue = parseFloat(cleaned) || 0;
    }

    // Determine status
    let status: 'NUOVO' | 'CONTATTATO' | 'ISCRITTO' = 'NUOVO';
    if (isEnrolled) status = 'ISCRITTO';
    else if (isContacted) status = 'CONTATTATO';

    leadsToInsert.push({
      name,
      courseId,
      assignedToId,
      createdById: adminUser.id,
      createdAt,
      updatedAt: createdAt,
      enrolled: isEnrolled,
      contacted: isContacted,
      isTarget,
      revenue,
      source: 'LEGACY_IMPORT',
      notes: row['Note'] || null,
      status,
    });
  }

  console.log(`      Leads to insert: ${leadsToInsert.length}`);
  console.log(`      Skipped (no name): ${stats.skippedNoName}`);
  console.log(`      Skipped (no course): ${stats.skippedNoCourse}`);
  console.log(`      Empty dates (used today): ${stats.emptyDate}`);
  console.log(`      Invalid dates (used today): ${stats.invalidDate}`);
  console.log(`      Users matched: ${stats.userMatched}`);
  console.log(`      Users fallback to admin: ${stats.userFallback}\n`);

  // === STEP 5: Insert in batches ===
  console.log('[5/5] Inserting leads...');
  
  const CHUNK_SIZE = 500;
  let insertedCount = 0;
  
  for (let i = 0; i < leadsToInsert.length; i += CHUNK_SIZE) {
    const chunk = leadsToInsert.slice(i, i + CHUNK_SIZE);
    const result = await prisma.lead.createMany({ 
      data: chunk, 
      skipDuplicates: true 
    });
    insertedCount += result.count;
    
    const progress = Math.round((i + chunk.length) / leadsToInsert.length * 100);
    process.stdout.write(`\r      Progress: ${progress}% (${i + chunk.length}/${leadsToInsert.length})`);
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total Inserted: ${insertedCount}`);
  console.log(`Total Skipped: ${stats.skippedNoName + stats.skippedNoCourse}`);
  
  // Final verification
  const finalCount = await prisma.lead.count();
  console.log(`\nVerification: ${finalCount} leads in database`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
