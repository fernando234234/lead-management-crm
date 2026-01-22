import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BATCH REASSIGNING LEADS TO COMMERCIALS ===\n');

  // Get commercial users
  const commercials = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true }
  });
  
  const commercialMap = new Map<string, string>();
  for (const c of commercials) {
    commercialMap.set(c.name.toLowerCase(), c.id);
  }
  // Typo fix
  const silvanaId = commercialMap.get('silvana');
  if (silvanaId) commercialMap.set('sivana', silvanaId);

  console.log('Commercial IDs:');
  commercialMap.forEach((id, name) => console.log(`  ${name}: ${id}`));

  // Read CSV and build mapping
  console.log('\nReading CSV...');
  const content = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Dashboard_Commerciale_Formazione (4) - Dati (1).csv', 'utf-8');
  const lines = content.split('\n');
  
  const leadToCommercial = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.match(/^,+0?$/)) continue;
    
    const cols = line.split(',');
    const leadName = (cols[1] || '').trim().toLowerCase();
    const commercial = (cols[2] || '').trim().toLowerCase();
    
    if (leadName && commercial && !leadToCommercial.has(leadName)) {
      leadToCommercial.set(leadName, commercial);
    }
  }
  console.log(`Built mapping for ${leadToCommercial.size} lead names\n`);

  // Get Admin user ID to skip already-correct assignments
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) throw new Error('No admin user found');

  // Batch update for each commercial
  for (const [commName, commId] of commercialMap) {
    // Find lead names assigned to this commercial in CSV
    const leadNames: string[] = [];
    leadToCommercial.forEach((comm, name) => {
      if (comm === commName) leadNames.push(name);
    });
    
    if (leadNames.length === 0) continue;
    
    console.log(`Updating leads for ${commName} (${leadNames.length} potential)...`);
    
    // Batch update using raw query for speed
    // Update leads where name matches (case insensitive) and currently assigned to admin
    let updated = 0;
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < leadNames.length; i += BATCH_SIZE) {
      const batch = leadNames.slice(i, i + BATCH_SIZE);
      
      const result = await prisma.lead.updateMany({
        where: {
          AND: [
            { assignedToId: adminUser.id },
            {
              OR: batch.map(name => ({
                name: { equals: name, mode: 'insensitive' as const }
              }))
            }
          ]
        },
        data: { assignedToId: commId }
      });
      
      updated += result.count;
    }
    
    console.log(`  -> Updated ${updated} leads`);
  }

  // Final stats
  console.log('\n=== FINAL STATE ===');
  const stats = await prisma.lead.groupBy({
    by: ['assignedToId'],
    _count: true
  });
  
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = new Map(users.map(u => [u.id, u.name]));
  
  for (const stat of stats) {
    console.log(`  ${userMap.get(stat.assignedToId) || 'Unknown'}: ${stat._count} leads`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
