import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')  // collapse whitespace
    .replace(/,.*$/, '')   // remove everything after comma
    .trim();
}

async function main() {
  console.log('=== FIXING REMAINING UNASSIGNED LEADS ===\n');

  // Get commercial users
  const commercials = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true }
  });
  
  const commercialMap = new Map<string, string>();
  for (const c of commercials) {
    commercialMap.set(c.name.toLowerCase(), c.id);
  }
  commercialMap.set('sivana', commercialMap.get('silvana')!);

  // Read CSV and build normalized mapping
  const content = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Dashboard_Commerciale_Formazione (4) - Dati (1).csv', 'utf-8');
  const lines = content.split('\n');
  
  const nameToCommercial = new Map<string, string>();
  for (const line of lines) {
    const cols = line.split(',');
    const rawName = (cols[1] || '').trim();
    const commercial = (cols[2] || '').trim().toLowerCase();
    if (rawName && commercial) {
      const normalized = normalizeName(rawName);
      if (!nameToCommercial.has(normalized)) {
        nameToCommercial.set(normalized, commercial);
      }
    }
  }
  console.log(`CSV has ${nameToCommercial.size} unique normalized names\n`);

  // Get admin user
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) throw new Error('No admin user');

  // Get unassigned leads
  const unassigned = await prisma.lead.findMany({
    where: { assignedToId: adminUser.id },
    select: { id: true, name: true }
  });
  
  console.log(`Found ${unassigned.length} leads still assigned to Admin\n`);

  let updated = 0;
  let stillUnmatched = 0;
  const stats: Record<string, number> = {};

  for (const lead of unassigned) {
    const normalized = normalizeName(lead.name);
    const commercial = nameToCommercial.get(normalized);
    
    if (!commercial) {
      stillUnmatched++;
      continue;
    }
    
    const commercialId = commercialMap.get(commercial);
    if (!commercialId) {
      stillUnmatched++;
      continue;
    }
    
    await prisma.lead.update({
      where: { id: lead.id },
      data: { assignedToId: commercialId }
    });
    updated++;
    stats[commercial] = (stats[commercial] || 0) + 1;
  }

  console.log('=== RESULTS ===');
  console.log(`Updated: ${updated}`);
  console.log(`Still unmatched: ${stillUnmatched}`);
  
  console.log('\n=== BY COMMERCIAL ===');
  for (const [name, count] of Object.entries(stats)) {
    console.log(`  ${name}: ${count}`);
  }

  // Show remaining unmatched
  if (stillUnmatched > 0) {
    const remaining = await prisma.lead.findMany({
      where: { assignedToId: adminUser.id },
      select: { name: true },
      take: 20
    });
    console.log('\n=== SAMPLE REMAINING UNMATCHED ===');
    remaining.forEach(l => console.log(`  "${l.name}"`));
  }

  // Final state
  const finalStats = await prisma.lead.groupBy({
    by: ['assignedToId'],
    _count: true
  });
  
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = new Map(users.map(u => [u.id, u.name]));
  
  console.log('\n=== FINAL STATE ===');
  for (const stat of finalStats) {
    console.log(`  ${userMap.get(stat.assignedToId) || 'Unknown'}: ${stat._count} leads`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
