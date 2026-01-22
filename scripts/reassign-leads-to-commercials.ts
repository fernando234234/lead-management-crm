import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();
const CSV_PATH = 'C:\\Users\\ferna\\Downloads\\Dashboard_Commerciale_Formazione (4) - Dati (1).csv';

// Map of commercial name variations to canonical names
const COMMERCIAL_ALIASES: Record<string, string> = {
  'simone': 'Simone',
  'marilena': 'Marilena', 
  'marcella': 'Marcella',
  'eleonora': 'Eleonora',
  'martina': 'Martina',
  'natascia': 'Natascia',
  'silvana': 'Silvana',
  'sivana': 'Silvana', // typo fix
};

async function main() {
  console.log('=== REASSIGNING LEADS TO CORRECT COMMERCIALS ===\n');

  // 1. Load CSV
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim() && !l.match(/^,+0?$/));
  console.log(`Loaded ${lines.length - 1} rows from CSV\n`);

  // 2. Get all commercial users from database
  const commercials = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true, username: true }
  });
  
  console.log('Commercial users in database:');
  commercials.forEach(c => console.log(`  - ${c.name} (${c.username})`));
  
  const commercialMap = new Map(commercials.map(c => [c.name.toLowerCase(), c.id]));

  // 3. Build lead-to-commercial mapping from CSV
  // Map: lead name + date -> commercial name
  const leadAssignments = new Map<string, string>();
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 3) continue;
    
    const leadName = (cols[1] || '').trim();
    const commercialName = (cols[2] || '').trim().toLowerCase();
    const date = (cols[0] || '').trim();
    
    if (!leadName || !commercialName) continue;
    
    // Normalize commercial name
    const canonicalCommercial = COMMERCIAL_ALIASES[commercialName] || commercialName;
    
    // Create unique key for lead
    const key = `${leadName.toLowerCase()}|${date}`;
    leadAssignments.set(key, canonicalCommercial.toLowerCase());
  }
  
  console.log(`\nBuilt ${leadAssignments.size} lead-to-commercial mappings from CSV\n`);

  // 4. Get all leads from database
  const leads = await prisma.lead.findMany({
    select: { id: true, name: true, createdAt: true, assignedToId: true }
  });
  
  console.log(`Found ${leads.length} leads in database\n`);

  // 5. Match and update leads
  let updatedCount = 0;
  let notFoundCount = 0;
  let alreadyCorrectCount = 0;
  const stats = new Map<string, number>();

  for (const lead of leads) {
    // Format date as DD/MM/YYYY to match CSV
    const date = lead.createdAt.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    }).replace(/\//g, '/');
    
    const key = `${lead.name.toLowerCase()}|${date}`;
    const commercialName = leadAssignments.get(key);
    
    if (!commercialName) {
      // Try without date
      const keyNoDate = lead.name.toLowerCase();
      const matchingKeys = Array.from(leadAssignments.entries())
        .filter(([k]) => k.startsWith(keyNoDate + '|'));
      
      if (matchingKeys.length === 1) {
        // Unique match found
        const [, comm] = matchingKeys[0];
        const commercialId = commercialMap.get(comm);
        if (commercialId && commercialId !== lead.assignedToId) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { assignedToId: commercialId }
          });
          updatedCount++;
          stats.set(comm, (stats.get(comm) || 0) + 1);
        }
      } else {
        notFoundCount++;
      }
      continue;
    }
    
    const commercialId = commercialMap.get(commercialName);
    if (!commercialId) {
      notFoundCount++;
      continue;
    }
    
    if (lead.assignedToId === commercialId) {
      alreadyCorrectCount++;
      continue;
    }
    
    // Update lead assignment
    await prisma.lead.update({
      where: { id: lead.id },
      data: { assignedToId: commercialId }
    });
    updatedCount++;
    stats.set(commercialName, (stats.get(commercialName) || 0) + 1);
    
    if (updatedCount % 500 === 0) {
      process.stdout.write(`[${updatedCount} updated] `);
    }
  }

  console.log('\n\n=== RESULTS ===');
  console.log(`Updated: ${updatedCount}`);
  console.log(`Already correct: ${alreadyCorrectCount}`);
  console.log(`Not found in CSV: ${notFoundCount}`);
  
  console.log('\n=== ASSIGNMENTS BY COMMERCIAL ===');
  for (const [name, count] of stats) {
    console.log(`  ${name}: ${count} leads`);
  }

  // 6. Verify final state
  const finalStats = await prisma.lead.groupBy({
    by: ['assignedToId'],
    _count: true
  });
  
  console.log('\n=== FINAL DATABASE STATE ===');
  for (const stat of finalStats) {
    const user = commercials.find(c => c.id === stat.assignedToId);
    console.log(`  ${user?.name || 'Admin/Other'}: ${stat._count} leads`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
