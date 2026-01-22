import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { writeFileSync, mkdirSync } from 'fs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'CambiaMi2026!';
const SITE_URL = 'https://lead-management-crm-ashen.vercel.app/';

async function run() {
  // Hash the password
  const hashedPassword = await hash(DEFAULT_PASSWORD, 12);
  
  // Update all commercials - set password and force change
  const result = await prisma.user.updateMany({
    where: { role: 'COMMERCIAL' },
    data: { 
      password: hashedPassword,
      mustChangePassword: true
    }
  });
  
  console.log(`Updated ${result.count} commercials with new password\n`);
  
  // Get all commercials
  const users = await prisma.user.findMany({ 
    where: { role: 'COMMERCIAL' }, 
    orderBy: { name: 'asc' } 
  });
  
  // Create output folder
  const outputDir = 'C:/Users/ferna/Downloads/Credenziali_Commerciali';
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (e) {}
  
  // Create individual files
  for (const u of users) {
    const content = `
CREDENZIALI DI ACCESSO - CRM Lead Management
=============================================

Ciao ${u.name}!

Ecco le tue credenziali per accedere al sistema:

Sito: ${SITE_URL}

Username: ${u.username}
Password: ${DEFAULT_PASSWORD}

Al primo accesso ti verra' richiesto di cambiare la password.

Per qualsiasi problema, contatta l'amministratore.

=============================================
`;

    const filename = `${outputDir}/Credenziali_${u.name.replace(/\s+/g, '_')}.txt`;
    writeFileSync(filename, content.trim(), 'utf-8');
    console.log(`Created: ${filename}`);
  }
  
  console.log(`\nAll files saved to: ${outputDir}`);
  
  await prisma.$disconnect();
}

run().catch(console.error);
