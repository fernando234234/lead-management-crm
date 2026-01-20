import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const CSV_PATH = String.raw`C:\Users\ferna\Downloads\Dashboard_Merged_Final_CLEANED.csv`;

function parseCSV(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    const result: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row: string[] = [];
        let inQuote = false;
        let currentCell = '';
        for (let char of lines[i]) {
            if (char === '"') inQuote = !inQuote;
            else if (char === ',' && !inQuote) {
                row.push(currentCell.trim());
                currentCell = '';
            } else currentCell += char;
        }
        row.push(currentCell.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, index) => { obj[h] = row[index] || ''; });
        result.push(obj);
    }
    return result;
}

async function main() {
  console.log('🚀 Starting Optimized Final Import...');

  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(fileContent);
  console.log(`📦 Loaded ${records.length} records from CSV`);

  console.log('🧹 Clearing existing leads...');
  await prisma.lead.deleteMany();
  console.log('✅ Leads cleared.');

  // 1. Helpers
  const users = await prisma.user.findMany();
  const userMap = new Map(users.map(u => [u.name.toLowerCase(), u.id]));
  const adminUser = users.find(u => u.role === 'ADMIN') || users[0];

  // 2. Identify and Create ALL missing courses first
  console.log('📚 Resolving Courses...');
  const existingCourses = await prisma.course.findMany();
  const courseMap = new Map(existingCourses.map(c => [c.name.toLowerCase(), c.id]));
  
  const distinctCsvCourses = new Set(records.map(r => r['Corso']?.trim()).filter(Boolean));
  const coursesToCreate: string[] = [];
  
  for (const cName of Array.from(distinctCsvCourses)) {
      if (!courseMap.has(cName.toLowerCase())) {
          coursesToCreate.push(cName);
      }
  }
  
  if (coursesToCreate.length > 0) {
      console.log(`   Creating ${coursesToCreate.length} new courses...`);
      for (const cName of coursesToCreate) {
          const newC = await prisma.course.create({ data: { name: cName, price: 0, active: true } });
          courseMap.set(cName.toLowerCase(), newC.id);
      }
  }

  // 3. Prepare Batch Insert
  console.log('🔄 Preparing batches...');
  const leadsToInsert = [];
  let skippedCount = 0;

  for (const row of records) {
    const name = row['Nome Leads'];
    if (!name) continue;

    const courseName = row['Corso']?.trim();
    if (!courseName) { skippedCount++; continue; }
    
    const courseId = courseMap.get(courseName.toLowerCase());
    if (!courseId) { skippedCount++; continue; } // Should not happen

    // Resolve User
    let assignedToId = adminUser.id;
    const commercialName = row['Commerciale']?.trim();
    if (commercialName) {
      const lowerComm = commercialName.toLowerCase();
      if (userMap.has(lowerComm)) assignedToId = userMap.get(lowerComm)!;
      else {
        const partial = users.find(u => u.name.toLowerCase().includes(lowerComm));
        if (partial) assignedToId = partial.id;
      }
    }

    // Date - with validation
    let createdAt = new Date();
    if (row['Data']) {
       const parts = row['Data'].split('/'); // DD/MM/YYYY
       if (parts.length === 3) {
         const parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
         if (!isNaN(parsed.getTime())) createdAt = parsed;
       }
    }

    // Status
    const isEnrolled = String(row['Iscrizioni']).toUpperCase() === 'SI';
    const isContacted = String(row['Contattati']).toUpperCase() === 'SI' || isEnrolled;
    
    leadsToInsert.push({
        name,
        courseId,
        assignedToId,
        createdById: adminUser.id,
        createdAt: createdAt,
        updatedAt: createdAt,
        enrolled: isEnrolled,
        contacted: isContacted,
        isTarget: String(row['Lead Validi']).toUpperCase() === 'SI',
        revenue: parseFloat(row['Ricavi']) || 0,
        acquisitionCost: parseFloat(row['Spesa ads']) || 0,
        
        source: 'LEGACY_IMPORT' as any,
        notes: row['Note'] || undefined,
        
        status: (isEnrolled ? 'ISCRITTO' : (isContacted ? 'CONTATTATO' : 'NUOVO')) as any
      });
  }

  // 4. Batch Insert using createMany (MUCH faster)
  console.log(`💾 Inserting ${leadsToInsert.length} leads using createMany...`);
  
  // Remove undefined notes for createMany compatibility
  const cleanedLeads = leadsToInsert.map(lead => ({
    ...lead,
    notes: lead.notes || null
  }));
  
  const CHUNK_SIZE = 500;
  let insertedCount = 0;
  
  for (let i = 0; i < cleanedLeads.length; i += CHUNK_SIZE) {
      const chunk = cleanedLeads.slice(i, i + CHUNK_SIZE);
      const result = await prisma.lead.createMany({ data: chunk, skipDuplicates: true });
      insertedCount += result.count;
      process.stdout.write(`[${i + chunk.length}/${cleanedLeads.length}] `);
  }

  console.log('\n--------------------------------');
  console.log('✅ IMPORT COMPLETE');
  console.log(`Total Inserted: ${insertedCount}`);
  console.log(`Skipped (no course): ${skippedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
