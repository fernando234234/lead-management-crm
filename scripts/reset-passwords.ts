import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Eastside2026!';

async function run() {
  // Hash the password
  const hashedPassword = await hash(DEFAULT_PASSWORD, 12);
  
  // Update all commercials
  const result = await prisma.user.updateMany({
    where: { role: 'COMMERCIAL' },
    data: { password: hashedPassword }
  });
  
  console.log(`Updated ${result.count} commercials with new password\n`);
  
  // Get all commercials for the credentials file
  const users = await prisma.user.findMany({ 
    where: { role: 'COMMERCIAL' }, 
    orderBy: { name: 'asc' } 
  });
  
  const lines: string[] = [
    '=== CREDENZIALI COMMERCIALI ===',
    '',
    `Password iniziale per tutti: ${DEFAULT_PASSWORD}`,
    '(Consigliamo di cambiarla al primo accesso)',
    '',
    '---',
    '',
  ];
  
  for (const u of users) {
    lines.push(`Nome: ${u.name}`);
    lines.push(`Username: ${u.username}`);
    lines.push(`Password: ${DEFAULT_PASSWORD}`);
    lines.push('');
  }
  
  const output = lines.join('\n');
  console.log(output);
  
  writeFileSync('C:/Users/ferna/Downloads/Credenziali_Commerciali.txt', output, 'utf-8');
  console.log('\nSaved to: C:/Users/ferna/Downloads/Credenziali_Commerciali.txt');
  
  await prisma.$disconnect();
}

run().catch(console.error);
