import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ 
    where: { role: 'COMMERCIAL' }, 
    orderBy: { name: 'asc' } 
  });
  
  const lines: string[] = [
    '=== CREDENZIALI COMMERCIALI ===',
    '',
  ];
  
  for (const u of users) {
    lines.push(`Nome: ${u.name}`);
    lines.push(`Username: ${u.username}`);
    lines.push(`Email: ${u.email || 'N/A'}`);
    lines.push(`Password: (la password impostata al momento della creazione)`);
    lines.push('---');
  }
  
  const output = lines.join('\n');
  console.log(output);
  
  writeFileSync('C:/Users/ferna/Downloads/Credenziali_Commerciali.txt', output, 'utf-8');
  console.log('\nSaved to: C:/Users/ferna/Downloads/Credenziali_Commerciali.txt');
  
  await prisma.$disconnect();
}

run().catch(console.error);
