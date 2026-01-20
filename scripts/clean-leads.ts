import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    // Delete all leads
    const deleted = await p.lead.deleteMany({});
    console.log('Deleted:', deleted.count);
    
    // Verify
    const remaining = await p.lead.count();
    console.log('Remaining:', remaining);
}

main().finally(() => p.$disconnect());
