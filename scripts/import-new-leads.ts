import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const CSV_PATH = String.raw`C:\Users\ferna\Downloads\new_leads_jan_2026.csv`;

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

function normalizeName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

async function main() {
  console.log('🚀 Starting Incremental Import (with duplicate check)...');
  console.log(`📁 Source: ${CSV_PATH}`);

  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(fileContent);
  console.log(`📦 Loaded ${records.length} records from CSV`);

  // 1. Get existing leads for duplicate check
  console.log('\n🔍 Fetching existing leads for duplicate check...');
  const existingLeads = await prisma.lead.findMany({
    include: { course: { select: { name: true } } }
  });
  
  // Create a Set of "normalizedName|courseName" for fast lookup
  const existingSet = new Set(
    existingLeads.map(l => `${normalizeName(l.name)}|${l.course.name.toLowerCase()}`)
  );
  console.log(`   Found ${existingLeads.length} existing leads in database`);

  // 2. Get helpers
  const users = await prisma.user.findMany();
  const userMap = new Map(users.map(u => [u.name.toLowerCase(), u.id]));
  const adminUser = users.find(u => u.role === 'ADMIN') || users[0];

  // 3. Resolve Courses
  console.log('\n📚 Resolving Courses...');
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
          console.log(`   + ${cName}`);
      }
  }

  // 4. Check for duplicates and prepare insert
  console.log('\n🔄 Checking for duplicates...');
  const leadsToInsert = [];
  const duplicates: string[] = [];
  let skippedCount = 0;

  for (const row of records) {
    const name = row['Nome Leads']?.trim();
    if (!name) continue;

    const courseName = row['Corso']?.trim();
    if (!courseName) { skippedCount++; continue; }
    
    const courseId = courseMap.get(courseName.toLowerCase());
    if (!courseId) { skippedCount++; continue; }

    // Check for duplicate (same name + same course)
    const key = `${normalizeName(name)}|${courseName.toLowerCase()}`;
    if (existingSet.has(key)) {
      duplicates.push(`${name} (${courseName})`);
      continue;
    }

    // Add to set to prevent duplicates within this import
    existingSet.add(key);

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

    // Date
    let createdAt = new Date();
    if (row['Data']) {
       const parts = row['Data'].split('/');
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
        notes: row['Note'] || null,
        status: (isEnrolled ? 'ISCRITTO' : (isContacted ? 'CONTATTATO' : 'NUOVO')) as any
      });
  }

  // Report duplicates
  if (duplicates.length > 0) {
    console.log(`\n⚠️  Found ${duplicates.length} duplicates (will skip):`);
    duplicates.slice(0, 10).forEach(d => console.log(`   - ${d}`));
    if (duplicates.length > 10) console.log(`   ... and ${duplicates.length - 10} more`);
  } else {
    console.log('   ✅ No duplicates found!');
  }

  // 5. Insert new leads
  console.log(`\n💾 Inserting ${leadsToInsert.length} new leads...`);
  
  if (leadsToInsert.length === 0) {
    console.log('   Nothing to insert.');
  } else {
    const CHUNK_SIZE = 500;
    let insertedCount = 0;
    
    for (let i = 0; i < leadsToInsert.length; i += CHUNK_SIZE) {
        const chunk = leadsToInsert.slice(i, i + CHUNK_SIZE);
        const result = await prisma.lead.createMany({ data: chunk, skipDuplicates: true });
        insertedCount += result.count;
        process.stdout.write(`   [${i + chunk.length}/${leadsToInsert.length}] `);
    }
    console.log('');
    console.log(`   ✅ Inserted ${insertedCount} leads`);
  }

  console.log('\n================================');
  console.log('📊 IMPORT SUMMARY');
  console.log('================================');
  console.log(`Total in CSV:     ${records.length}`);
  console.log(`Duplicates:       ${duplicates.length}`);
  console.log(`Skipped (no data): ${skippedCount}`);
  console.log(`New leads added:  ${leadsToInsert.length}`);
  
  // Verify total
  const totalLeads = await prisma.lead.count();
  console.log(`\n📈 Total leads in database: ${totalLeads}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
