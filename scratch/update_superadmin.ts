import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const newEmail = "faizancheena9@gmail.com";
  const rawPassword = "Cupoftea@90";
  const hashedPassword = await bcrypt.hash(rawPassword, 12);

  console.log("Upserting Super Admin user with bcrypt hash...");

  const existing = await prisma.user.findFirst({
    where: { email: newEmail }
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        role: "SUPER_ADMIN",
        status: "APPROVED"
      }
    });
    console.log("Successfully hashed password for Super Admin user:", updated.email);
  } else {
    const created = await prisma.user.create({
      data: {
        id: "super-admin-faizan-id",
        email: newEmail,
        password: hashedPassword,
        name: "Faizan Cheena",
        role: "SUPER_ADMIN",
        status: "APPROVED",
        updatedAt: new Date()
      }
    });
    console.log("Created new Super Admin user with hashed password:", created.email);
  }
}

main()
  .catch((e) => {
    console.error("Error updating superadmin:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
