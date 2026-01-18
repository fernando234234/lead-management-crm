import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.upsert({
    where: { email: "marketing@leadcrm.it" },
    update: {},
    create: {
      email: "marketing@leadcrm.it",
      name: "Maria Rossi",
      password: hashedPassword,
      role: "MARKETING",
    },
  });

  console.log("Marketing user created/updated:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
