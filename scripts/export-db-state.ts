/**
 * EXPORT DATABASE STATE TO CSV
 * ============================
 * 
 * Exports current database state to CSV files for comparison/audit.
 * 
 * OUTPUTS:
 * - db_leads.csv - All leads with status, course, commercial
 * - db_iscritti.csv - Only enrolled leads
 * - db_comparison.csv - Comparison with contracts CSV
 * 
 * USAGE:
 * npx tsx scripts/export-db-state.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

const OUTPUT_DIR = String.raw`C:\Users\ferna\Downloads\DB_Export`;

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

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
      if (inQuote && nextChar === '"') { currentCell += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (char === ',' && !inQuote) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuote) {
      if (char === '\r') i++;
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (isFirstRow) { headers = currentRow; isFirstRow = false; }
      else if (currentRow.some(c => c)) {
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => { obj[h] = currentRow[idx] || ''; });
        result.push(obj);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }
  return result;
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  console.log('='.repeat(60));
  console.log('EXPORT DATABASE STATE');
  console.log('='.repeat(60));

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load all leads with relations
  const leads = await prisma.lead.findMany({
    include: {
      course: true,
      assignedTo: true,
    },
    orderBy: [
      { status: 'asc' },
      { name: 'asc' }
    ]
  });

  console.log(`\nLoaded ${leads.length} leads from database`);

  // === Export 1: All leads ===
  const allLeadsCSV = [
    'Nome,Corso,Status,Commerciale,EnrolledAt,CreatedAt,Notes'
  ];
  
  for (const lead of leads) {
    allLeadsCSV.push([
      escapeCSV(lead.name),
      escapeCSV(lead.course.name),
      escapeCSV(lead.status),
      escapeCSV(lead.assignedTo?.name || 'N/A'),
      escapeCSV(lead.enrolledAt?.toISOString().split('T')[0] || ''),
      escapeCSV(lead.createdAt.toISOString().split('T')[0]),
      escapeCSV(lead.notes)
    ].join(','));
  }

  const allLeadsPath = `${OUTPUT_DIR}\\db_leads.csv`;
  fs.writeFileSync(allLeadsPath, allLeadsCSV.join('\n'), 'utf-8');
  console.log(`\nExported all leads to: ${allLeadsPath}`);

  // === Export 2: Only ISCRITTO ===
  const iscrittiLeads = leads.filter(l => l.status === 'ISCRITTO');
  
  const iscrittiCSV = [
    'Nome,Corso,Commerciale,EnrolledAt'
  ];
  
  for (const lead of iscrittiLeads) {
    iscrittiCSV.push([
      escapeCSV(lead.name),
      escapeCSV(lead.course.name),
      escapeCSV(lead.assignedTo?.name || 'N/A'),
      escapeCSV(lead.enrolledAt?.toISOString().split('T')[0] || '')
    ].join(','));
  }

  const iscrittiPath = `${OUTPUT_DIR}\\db_iscritti.csv`;
  fs.writeFileSync(iscrittiPath, iscrittiCSV.join('\n'), 'utf-8');
  console.log(`Exported ${iscrittiLeads.length} ISCRITTO to: ${iscrittiPath}`);

  // === Export 3: Comparison with contracts CSV ===
  const contractsPath = String.raw`C:\Users\ferna\Downloads\Contratti_VALID_485.csv`;
  
  if (fs.existsSync(contractsPath)) {
    const contracts = parseCSV(fs.readFileSync(contractsPath, 'utf-8'));
    console.log(`\nLoaded ${contracts.length} contracts for comparison`);

    // Build DB lookup
    const dbLookup = new Map<string, typeof leads[0]>();
    for (const lead of iscrittiLeads) {
      const key = `${normalize(lead.name)}|${normalize(lead.course.name)}`;
      dbLookup.set(key, lead);
    }

    const comparisonCSV = [
      'Studente_Contratto,Corso_Contratto,Status_Match,DB_Nome,DB_Corso,DB_Commerciale'
    ];

    let matched = 0;
    let unmatched = 0;

    for (const c of contracts) {
      const key = `${normalize(c.Studente)}|${normalize(c.Corso)}`;
      const dbLead = dbLookup.get(key);

      if (dbLead) {
        matched++;
        comparisonCSV.push([
          escapeCSV(c.Studente),
          escapeCSV(c.Corso),
          'MATCHED',
          escapeCSV(dbLead.name),
          escapeCSV(dbLead.course.name),
          escapeCSV(dbLead.assignedTo?.name || 'N/A')
        ].join(','));
        dbLookup.delete(key); // Mark as used
      } else {
        unmatched++;
        comparisonCSV.push([
          escapeCSV(c.Studente),
          escapeCSV(c.Corso),
          'NOT IN DB',
          '',
          '',
          ''
        ].join(','));
      }
    }

    // Add DB entries not in contracts
    for (const [key, lead] of dbLookup) {
      comparisonCSV.push([
        '',
        '',
        'ONLY IN DB',
        escapeCSV(lead.name),
        escapeCSV(lead.course.name),
        escapeCSV(lead.assignedTo?.name || 'N/A')
      ].join(','));
    }

    const comparisonPath = `${OUTPUT_DIR}\\db_comparison.csv`;
    fs.writeFileSync(comparisonPath, comparisonCSV.join('\n'), 'utf-8');
    console.log(`Exported comparison to: ${comparisonPath}`);
    console.log(`  - Matched: ${matched}`);
    console.log(`  - Not in DB: ${unmatched}`);
    console.log(`  - Only in DB: ${dbLookup.size}`);
  }

  // === Summary ===
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const statusCounts = await prisma.lead.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  
  console.log('\nDatabase Status Breakdown:');
  for (const s of statusCounts) {
    console.log(`  ${s.status}: ${s._count.id}`);
  }
  
  console.log(`\nExport location: ${OUTPUT_DIR}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
