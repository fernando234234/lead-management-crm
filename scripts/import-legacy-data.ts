/**
 * Legacy Data Import Script
 * 
 * Imports leads from Excel file (Dashboard_Commerciale_Formazione_UPDATED.xlsx)
 * into the CRM database with proper data normalization.
 * 
 * Usage: npx ts-node scripts/import-legacy-data.ts [--dry-run]
 */

import { PrismaClient, LeadStatus, LeadSource, UserRole, Platform, CampaignStatus } from '@prisma/client';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const { hash } = bcrypt;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Load mapping files
const consultantMappings = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../prisma/mappings/consultants.json'), 'utf-8')
);
const courseMappings = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../prisma/mappings/courses.json'), 'utf-8')
);

// Excel file path
const EXCEL_PATH = 'C:/Users/ferna/Downloads/Dashboard_Commerciale_Formazione_UPDATED.xlsx';

// Check for dry run mode
const DRY_RUN = process.argv.includes('--dry-run');

interface ExcelRow {
  data: number;           // Excel serial date
  nomeLead: string;
  consulente: string;
  corso: string;
  sorgente: string | null;
  campagna: string | null;
  leadGenerati: number;
  leadValidi: string;     // "SI" or "NO" or empty
  contattati: string;     // "SI" or "NO" or empty
  telXEsito: string;
  iscrizioni: string;     // "SI" or "NO" or empty
  spesaAds: number;
  ricavi: number;
}

interface ImportStats {
  totalRows: number;
  usersCreated: number;
  coursesCreated: number;
  leadsCreated: number;
  leadsSkipped: number;
  errors: string[];
}

/**
 * Convert Excel serial date to JavaScript Date
 */
function excelDateToJS(serial: number): Date {
  // Excel dates start from 1900-01-01 (serial 1)
  // But there's a bug in Excel that counts 1900 as a leap year
  const utcDays = serial - 25569; // Days since 1970-01-01
  const date = new Date(utcDays * 86400 * 1000);
  return date;
}

/**
 * Normalize and map consultant name to canonical name
 */
function normalizeConsultant(rawName: string | null): string | null {
  if (!rawName) return null;
  const trimmed = rawName.trim();
  return consultantMappings.mappings[trimmed] || null;
}

/**
 * Normalize and map course name to canonical name
 */
function normalizeCourse(rawName: string | null): string | null {
  if (!rawName) return null;
  const trimmed = rawName.trim();
  return courseMappings.mappings[trimmed] || null;
}

/**
 * Derive lead status from Excel columns
 */
function deriveStatus(leadValidi: string, contattati: string, iscrizioni: string): LeadStatus {
  const isValid = leadValidi?.toUpperCase() === 'SI';
  const isContacted = contattati?.toUpperCase() === 'SI';
  const isEnrolled = iscrizioni?.toUpperCase() === 'SI';

  if (!isValid) return LeadStatus.PERSO;
  if (isEnrolled) return LeadStatus.ISCRITTO;
  if (isContacted) return LeadStatus.CONTATTATO;
  return LeadStatus.NUOVO;
}

/**
 * Parse Excel row to structured data
 */
function parseRow(row: any[]): ExcelRow | null {
  if (!row || row.length < 2) return null;
  
  return {
    data: row[0] as number,
    nomeLead: row[1] ? String(row[1]).trim() : '',
    consulente: row[2] ? String(row[2]).trim() : '',
    corso: row[3] ? String(row[3]).trim() : '',
    sorgente: row[4] ? String(row[4]).trim() : null,
    campagna: row[5] ? String(row[5]).trim() : null,
    leadGenerati: row[6] as number || 1,
    leadValidi: row[7] ? String(row[7]).trim() : '',
    contattati: row[8] ? String(row[8]).trim() : '',
    telXEsito: row[9] ? String(row[9]).trim() : '',
    iscrizioni: row[10] ? String(row[10]).trim() : '',
    spesaAds: typeof row[11] === 'number' ? row[11] : 0,
    ricavi: typeof row[12] === 'number' ? row[12] : 0,
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('LEGACY DATA IMPORT SCRIPT');
  console.log(DRY_RUN ? '>>> DRY RUN MODE - No changes will be made <<<' : '>>> LIVE MODE <<<');
  console.log('='.repeat(60));
  console.log('');

  const stats: ImportStats = {
    totalRows: 0,
    usersCreated: 0,
    coursesCreated: 0,
    leadsCreated: 0,
    leadsSkipped: 0,
    errors: [],
  };

  // Step 1: Load Excel file
  console.log('Loading Excel file...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const datiSheet = workbook.Sheets['Dati'];
  const rawData = XLSX.utils.sheet_to_json(datiSheet, { header: 1 }) as any[][];
  
  // Skip header row
  const dataRows = rawData.slice(1);
  stats.totalRows = dataRows.length;
  console.log(`Found ${stats.totalRows} rows in Excel\n`);

  if (!DRY_RUN) {
    // Step 2: Clear existing data
    console.log('Clearing existing data...');
    await prisma.leadActivity.deleteMany();
    await prisma.task.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.campaignSpend.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.course.deleteMany();
    await prisma.profitabilityRecord.deleteMany();
    // Keep users or delete? Let's keep admin but replace commercials
    await prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } });
    console.log('Data cleared.\n');
  }

  // Step 3: Create admin user if not exists
  console.log('Ensuring admin user exists...');
  const hashedPassword = await hash('admin123', 12);
  if (!DRY_RUN) {
    await prisma.user.upsert({
      where: { email: 'admin@leadcrm.it' },
      update: {},
      create: {
        email: 'admin@leadcrm.it',
        name: 'Admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
    });
  }
  console.log('Admin user ready.\n');

  // Step 4: Create users from consultant mappings
  console.log('Creating commercial users...');
  const userMap = new Map<string, string>(); // canonical name -> user ID
  
  for (const user of consultantMappings.canonicalUsers) {
    if (!DRY_RUN) {
      const created = await prisma.user.create({
        data: {
          email: user.email,
          name: user.name,
          password: hashedPassword,
          role: UserRole.COMMERCIAL,
        },
      });
      userMap.set(user.name, created.id);
      stats.usersCreated++;
    } else {
      userMap.set(user.name, `fake-id-${user.name}`);
      stats.usersCreated++;
    }
    console.log(`  Created: ${user.name}`);
  }
  console.log(`Created ${stats.usersCreated} users.\n`);

  // Step 5: Create courses from course mappings
  console.log('Creating courses...');
  const courseMap = new Map<string, string>(); // canonical name -> course ID
  
  for (const course of courseMappings.canonicalCourses) {
    if (!DRY_RUN) {
      const created = await prisma.course.create({
        data: {
          name: course.name,
          price: course.price,
          description: `Corso di ${course.name}`,
          active: true,
        },
      });
      courseMap.set(course.name, created.id);
      stats.coursesCreated++;
    } else {
      courseMap.set(course.name, `fake-id-${course.name}`);
      stats.coursesCreated++;
    }
    console.log(`  Created: ${course.name} (€${course.price})`);
  }
  console.log(`Created ${stats.coursesCreated} courses.\n`);

  // Step 6: Create Legacy Import campaign
  console.log('Creating legacy import campaign...');
  let legacyCampaignId: string;
  
  // Get first course for campaign (required field)
  const firstCourseId = courseMap.values().next().value;
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  
  if (!DRY_RUN && adminUser && firstCourseId) {
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Legacy Import',
        platform: Platform.FACEBOOK, // Default
        courseId: firstCourseId,
        createdById: adminUser.id,
        budget: 0,
        status: CampaignStatus.COMPLETED,
      },
    });
    legacyCampaignId = campaign.id;
  } else {
    legacyCampaignId = 'fake-legacy-campaign-id';
  }
  console.log('Legacy campaign created.\n');

  // Step 7: Import leads
  console.log('Importing leads...');
  let processedCount = 0;
  const batchSize = 500;
  const leadsToCreate: any[] = [];

  for (const row of dataRows) {
    processedCount++;
    
    const parsed = parseRow(row);
    if (!parsed || !parsed.nomeLead) {
      stats.leadsSkipped++;
      continue;
    }

    // Normalize consultant and course
    const canonicalConsultant = normalizeConsultant(parsed.consulente);
    const canonicalCourse = normalizeCourse(parsed.corso);

    if (!canonicalCourse) {
      stats.leadsSkipped++;
      stats.errors.push(`Row ${processedCount}: Unknown course "${parsed.corso}"`);
      continue;
    }

    const courseId = courseMap.get(canonicalCourse);
    if (!courseId) {
      stats.leadsSkipped++;
      stats.errors.push(`Row ${processedCount}: Course not in map "${canonicalCourse}"`);
      continue;
    }

    // Get user ID if consultant mapped
    const assignedToId = canonicalConsultant ? userMap.get(canonicalConsultant) : null;

    // Derive status
    const status = deriveStatus(parsed.leadValidi, parsed.contattati, parsed.iscrizioni);
    const isTarget = parsed.leadValidi?.toUpperCase() === 'SI';
    const contacted = parsed.contattati?.toUpperCase() === 'SI';
    const enrolled = parsed.iscrizioni?.toUpperCase() === 'SI';

    // Parse date
    let createdAt = new Date();
    if (typeof parsed.data === 'number' && parsed.data > 0) {
      try {
        createdAt = excelDateToJS(parsed.data);
      } catch (e) {
        // Keep default date
      }
    }

    const leadData = {
      name: parsed.nomeLead,
      email: null,
      phone: null,
      courseId,
      isTarget,
      contacted,
      contactedAt: contacted ? createdAt : null,
      contactedById: contacted && assignedToId ? assignedToId : null,
      enrolled,
      enrolledAt: enrolled ? createdAt : null,
      assignedToId: assignedToId || null,
      campaignId: legacyCampaignId,
      acquisitionCost: parsed.spesaAds > 0 ? parsed.spesaAds : null,
      revenue: parsed.ricavi > 0 ? parsed.ricavi : null,
      source: LeadSource.LEGACY_IMPORT,
      status,
      createdAt,
      updatedAt: createdAt,
    };

    leadsToCreate.push(leadData);

    // Batch insert
    if (leadsToCreate.length >= batchSize) {
      if (!DRY_RUN) {
        await prisma.lead.createMany({ data: leadsToCreate });
      }
      stats.leadsCreated += leadsToCreate.length;
      console.log(`  Processed ${stats.leadsCreated} leads...`);
      leadsToCreate.length = 0;
    }
  }

  // Insert remaining leads
  if (leadsToCreate.length > 0) {
    if (!DRY_RUN) {
      await prisma.lead.createMany({ data: leadsToCreate });
    }
    stats.leadsCreated += leadsToCreate.length;
  }

  console.log(`\nImport complete!\n`);

  // Print summary
  console.log('='.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Excel rows:     ${stats.totalRows}`);
  console.log(`Users created:        ${stats.usersCreated}`);
  console.log(`Courses created:      ${stats.coursesCreated}`);
  console.log(`Leads imported:       ${stats.leadsCreated}`);
  console.log(`Leads skipped:        ${stats.leadsSkipped}`);
  console.log(`Errors:               ${stats.errors.length}`);
  
  if (stats.errors.length > 0 && stats.errors.length <= 20) {
    console.log('\nErrors:');
    stats.errors.forEach(e => console.log(`  - ${e}`));
  } else if (stats.errors.length > 20) {
    console.log(`\nFirst 20 errors:`);
    stats.errors.slice(0, 20).forEach(e => console.log(`  - ${e}`));
    console.log(`  ... and ${stats.errors.length - 20} more`);
  }

  if (DRY_RUN) {
    console.log('\n>>> This was a DRY RUN. No data was actually imported. <<<');
    console.log('>>> Run without --dry-run to perform the actual import. <<<');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Import failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
