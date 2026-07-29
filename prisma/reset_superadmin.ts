import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting Super Admin credentials...");

  let company = await prisma.company.findFirst({
    where: { isArchived: false }
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        id: "acme-corp-id",
        name: "Acme Corp",
        status: "APPROVED",
        updatedAt: new Date()
      }
    });
  }

  const hashedPassword = await bcrypt.hash("Cupoftea@9090", 12);
  const email = "faizancheena9@gmail.com";

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "SUPER_ADMIN",
      status: "APPROVED",
      companyId: company.id,
      isArchived: false,
      updatedAt: new Date()
    },
    create: {
      id: "superadmin-faizan",
      email,
      name: "Super Admin",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      status: "APPROVED",
      companyId: company.id,
      updatedAt: new Date()
    }
  });

  console.log(`===================================================`);
  console.log(`SUCCESS! Super Admin Account Activated:`);
  console.log(`Email: ${user.email}`);
  console.log(`Password: Cupoftea@9090`);
  console.log(`Role: ${user.role}`);
  console.log(`===================================================`);
}

main()
  .catch((e) => {
    console.error("Reset Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
