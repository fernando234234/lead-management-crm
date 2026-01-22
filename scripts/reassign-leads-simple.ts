import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== REASSIGNING LEADS TO CORRECT COMMERCIALS ===\n');

  // Get all commercial users
  const commercials = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true }
  });
  
  console.log('Commercial users in database:');
  const commercialMap = new Map<string, string>();
  for (const c of commercials) {
    console.log(`  - ${c.name}`);
    commercialMap.set(c.name.toLowerCase(), c.id);
  }
  // Add typo fix
  const silvanaId = commercialMap.get('silvana');
  if (silvanaId) {
    commercialMap.set('sivana', silvanaId);
  }

  // Get leads with their notes (which might contain commercial info from old import)
  // OR use the createdBy info
  
  // Actually, let's check what info we have
  const sampleLeads = await prisma.lead.findMany({
    take: 10,
    select: { id: true, name: true, notes: true, createdAt: true }
  });
  
  console.log('\nSample leads:');
  sampleLeads.forEach(l => {
    console.log(`  - ${l.name} | notes: ${l.notes?.substring(0, 50) || 'null'}`);
  });

  // The issue is we need to match CSV data to DB data
  // Since we have 6662 leads and CSV has ~7300 with course data
  // Let's try matching by name + approximate date
  
  console.log('\nReading CSV in chunks to avoid memory issues...');
  
  const fs = await import('fs');
  const readline = await import('readline');
  
  const fileStream = fs.createReadStream('C:\\Users\\ferna\\Downloads\\Dashboard_Commerciale_Formazione (4) - Dati (1).csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  // Build a map of lead name -> commercial (first occurrence wins)
  const leadToCommercial = new Map<string, string>();
  let lineNum = 0;
  
  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; // skip header
    if (!line.trim() || line.match(/^,+0?$/)) continue;
    
    const cols = line.split(',');
    const leadName = (cols[1] || '').trim().toLowerCase();
    const commercial = (cols[2] || '').trim().toLowerCase();
    
    if (leadName && commercial && !leadToCommercial.has(leadName)) {
      leadToCommercial.set(leadName, commercial);
    }
  }
  
  console.log(`Built mapping for ${leadToCommercial.size} unique lead names\n`);

  // Now update leads in batches
  const allLeads = await prisma.lead.findMany({
    select: { id: true, name: true, assignedToId: true }
  });
  
  console.log(`Processing ${allLeads.length} leads...\n`);
  
  let updated = 0;
  let notFound = 0;
  let noCommercial = 0;
  const stats: Record<string, number> = {};
  
  for (const lead of allLeads) {
    const leadNameLower = lead.name.toLowerCase().trim();
    const commercial = leadToCommercial.get(leadNameLower);
    
    if (!commercial) {
      notFound++;
      continue;
    }
    
    const commercialId = commercialMap.get(commercial);
    if (!commercialId) {
      noCommercial++;
      continue;
    }
    
    if (lead.assignedToId !== commercialId) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { assignedToId: commercialId }
      });
      updated++;
      stats[commercial] = (stats[commercial] || 0) + 1;
      
      if (updated % 500 === 0) {
        console.log(`  Updated ${updated} leads...`);
      }
    }
  }

  console.log('\n=== RESULTS ===');
  console.log(`Updated: ${updated}`);
  console.log(`Not found in CSV: ${notFound}`);
  console.log(`Commercial not in DB: ${noCommercial}`);
  
  console.log('\n=== ASSIGNMENTS BY COMMERCIAL ===');
  for (const [name, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name}: ${count} leads`);
  }

  // Final verification
  const finalStats = await prisma.lead.groupBy({
    by: ['assignedToId'],
    _count: true
  });
  
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = new Map(users.map(u => [u.id, u.name]));
  
  console.log('\n=== FINAL DATABASE STATE ===');
  for (const stat of finalStats) {
    console.log(`  ${userMap.get(stat.assignedToId) || 'Unknown'}: ${stat._count} leads`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
