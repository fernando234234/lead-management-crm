import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

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
        currentCell += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuote) {
      if (char === '\r') i++;
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (isFirstRow) {
        headers = currentRow;
        isFirstRow = false;
      } else if (currentRow.some(c => c)) {
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

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function main() {
  const contractsFile = String.raw`C:\Users\ferna\Downloads\Contratti_VALID_485.csv`;
  const leadsFile = String.raw`C:\Users\ferna\Downloads\Dashboard_Merged_Final_CLEANED.csv`;
  
  const contracts = parseCSV(fs.readFileSync(contractsFile, 'utf-8'));
  const leadsCSV = parseCSV(fs.readFileSync(leadsFile, 'utf-8'));
  
  console.log(`Contracts: ${contracts.length}`);
  console.log(`Leads in CSV: ${leadsCSV.length}`);
  
  // Build lead lookup from CSV
  const leadLookup = new Map<string, any[]>();
  for (const lead of leadsCSV) {
    const name = normalize(lead['Nome Leads'] || '');
    if (!leadLookup.has(name)) leadLookup.set(name, []);
    leadLookup.get(name)!.push(lead);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('UNMATCHED CONTRACTS (not found in leads CSV)');
  console.log('='.repeat(70));
  
  let missing = 0;
  for (const c of contracts) {
    const studentName = normalize(c.Studente);
    const courseName = normalize(c.Corso);
    
    // Check if exact name+course exists in leads
    const matchingLeads = leadLookup.get(studentName) || [];
    const exactMatch = matchingLeads.find(l => normalize(l.Corso) === courseName);
    
    if (!exactMatch) {
      missing++;
      console.log(`\n${missing}. CONTRACT: "${c.Studente}" - ${c.Corso}`);
      console.log(`   Commerciale: ${c.Commerciale}`);
      console.log(`   Data Stipula: ${c.DataStipula}`);
      
      // Look for similar names in leads
      if (matchingLeads.length > 0) {
        console.log(`   FOUND SAME NAME with different courses:`);
        for (const l of matchingLeads) {
          console.log(`     - ${l.Corso} (Commerciale: ${l.Commerciale})`);
        }
      } else {
        // Try partial match
        const partialMatches: string[] = [];
        for (const [name, leads] of leadLookup.entries()) {
          if (name.includes(studentName.split(' ')[0]) || studentName.includes(name.split(' ')[0])) {
            if (name !== studentName) {
              partialMatches.push(`${leads[0]['Nome Leads']} (${leads.map(l => l.Corso).join(', ')})`);
            }
          }
        }
        if (partialMatches.length > 0 && partialMatches.length <= 5) {
          console.log(`   SIMILAR NAMES in leads:`);
          for (const m of partialMatches.slice(0, 5)) {
            console.log(`     - ${m}`);
          }
        } else {
          console.log(`   NO SIMILAR NAMES found in leads CSV`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL UNMATCHED: ${missing} out of ${contracts.length} contracts`);
  console.log('='.repeat(70));
}

main().finally(() => prisma.$disconnect());
