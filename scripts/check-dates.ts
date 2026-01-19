import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const results = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, COUNT(*)::int as count 
    FROM "Lead" 
    GROUP BY DATE("createdAt") 
    ORDER BY count DESC 
    LIMIT 10
  `;
  console.log('Lead createdAt distribution:');
  console.log(results);
}

main().catch(console.error).finally(() => prisma.$disconnect());
