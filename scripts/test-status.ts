import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Testing Lead Creation with 'status' field...");
  
  const user = await prisma.user.findFirst();
  const course = await prisma.course.findFirst();
  
  if (!user || !course) {
    console.log("❌ Cannot test: User or Course missing.");
    return;
  }

  try {
    const lead = await prisma.lead.create({
        data: {
            name: "Test Status Field",
            courseId: course.id,
            assignedToId: user.id,
            createdById: user.id,
            status: "NUOVO" as any, 
            source: "MANUAL" as any
        }
    });
    console.log("✅ Success! Lead created with status:", lead.status);
    
    // Cleanup
    await prisma.lead.delete({ where: { id: lead.id } });
  } catch (e: any) {
    console.error("❌ Failed:");
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
