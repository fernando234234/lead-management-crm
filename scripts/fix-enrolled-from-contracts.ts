import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();
const CONTRACTS_FILE = String.raw`C:\Users\ferna\Downloads\Contratti_CLEANED.xlsx`;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  // 1. Load contracts from cleaned file
  console.log('Loading contracts file...');
  console.log('  Path:', CONTRACTS_FILE);
  
  const workbook = XLSX.readFile(CONTRACTS_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
  
  // Create Set of 'normalizedName|normalizedCourse'
  const contractSet = new Set<string>();
  data.slice(1).forEach(row => {
    if (row[0] && row[1]) {
      const key = normalizeName(row[0]) + '|' + normalizeName(row[1]);
      contractSet.add(key);
    }
  });
  console.log('  Loaded ' + contractSet.size + ' unique contracts (name+course combinations)');
  
  // 2. Get all enrolled leads from CRM
  console.log('');
  console.log('Fetching enrolled leads from CRM...');
  const enrolledLeads = await prisma.lead.findMany({
    where: { enrolled: true },
    include: { course: { select: { name: true } } }
  });
  console.log('  Found ' + enrolledLeads.length + ' leads marked as enrolled');
  
  // 3. Check which enrolled leads are NOT in contracts file
  console.log('');
  console.log('Cross-referencing...');
  const notInContracts: typeof enrolledLeads = [];
  const inContracts: typeof enrolledLeads = [];
  
  enrolledLeads.forEach(lead => {
    const key = normalizeName(lead.name) + '|' + normalizeName(lead.course.name);
    if (contractSet.has(key)) {
      inContracts.push(lead);
    } else {
      notInContracts.push(lead);
    }
  });
  
  console.log('');
  console.log('='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  console.log('  In contracts file (valid):     ' + inContracts.length);
  console.log('  NOT in contracts file (fix):   ' + notInContracts.length);
  
  if (notInContracts.length === 0) {
    console.log('');
    console.log('✅ All enrolled leads are in the contracts file!');
    return;
  }

  console.log('');
  console.log('Leads to fix (enrolled=true but NO contract):');
  notInContracts.slice(0, 20).forEach(l => {
    console.log('  - ' + l.name + ' (' + l.course.name + ')');
  });
  if (notInContracts.length > 20) {
    console.log('  ... and ' + (notInContracts.length - 20) + ' more');
  }

  // 4. Fix them - set enrolled=false
  console.log('');
  console.log('Fixing ' + notInContracts.length + ' leads (setting enrolled=false)...');
  
  const ids = notInContracts.map(l => l.id);
  const result = await prisma.lead.updateMany({
    where: { id: { in: ids } },
    data: { 
      enrolled: false,
      status: 'CONTATTATO' // Reset status from ISCRITTO
    }
  });
  
  console.log('  ✅ Updated ' + result.count + ' leads');
  
  // 5. Verify
  const remainingEnrolled = await prisma.lead.count({ where: { enrolled: true } });
  console.log('');
  console.log('Verification:');
  console.log('  Enrolled leads remaining: ' + remainingEnrolled);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
