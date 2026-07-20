import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding default authentication accounts...");

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

  const companyId = company.id;
  console.log(`Using Company: ${company.name} (${companyId})`);

  const usersToSeed = [
    {
      email: "faizancheena9@gmail.com",
      name: "Super Admin",
      role: "SUPER_ADMIN",
      passwordRaw: "Cupoftea@90",
      companyId: companyId
    },
    {
      email: "owner@acme.com",
      name: "Acme Owner",
      role: "COMPANY_OWNER",
      passwordRaw: "pass123",
      companyId: companyId
    },
    {
      email: "it@acme.com",
      name: "IT Operations",
      role: "IT_DEPARTMENT",
      passwordRaw: "pass123",
      companyId: companyId
    },
    {
      email: "lead@acme.com",
      name: "Team Lead Acme",
      role: "TEAM_LEAD",
      passwordRaw: "pass123",
      companyId: companyId
    },
    {
      email: "tl1@acme.com",
      name: "John Lead",
      role: "TEAM_LEAD",
      passwordRaw: "pass123",
      companyId: companyId
    },
    {
      email: "sales@acme.com",
      name: "Sales Associate",
      role: "SALES_ASSOCIATE",
      passwordRaw: "pass123",
      companyId: companyId
    }
  ];

  for (const u of usersToSeed) {
    const hashedPassword = await bcrypt.hash(u.passwordRaw, 12);

    const existing = await prisma.user.findUnique({
      where: { email: u.email }
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          status: "APPROVED",
          password: hashedPassword,
          role: u.role as any,
          companyId: u.companyId,
          isArchived: false,
          updatedAt: new Date()
        }
      });
      console.log(`Updated user: ${u.email} (${u.role}) -> APPROVED`);
    } else {
      const newUserId = `usr-${u.email.split("@")[0]}`;
      await prisma.user.create({
        data: {
          id: newUserId,
          email: u.email,
          name: u.name,
          role: u.role as any,
          status: "APPROVED",
          password: hashedPassword,
          companyId: u.companyId,
          updatedAt: new Date()
        }
      });
      console.log(`Created user: ${u.email} (${u.role}) -> APPROVED`);
    }

    // Ensure employee record exists for non-admin roles
    if (u.role === "SALES_ASSOCIATE" || u.role === "TEAM_LEAD") {
      const empId = `emp-${u.email.split("@")[0]}`;
      const existingEmp = await prisma.employee.findFirst({
        where: { email: u.email }
      });
      if (!existingEmp) {
        await prisma.employee.create({
          data: {
            id: empId,
            employeeId: `EMP-${u.email.split("@")[0].toUpperCase()}`,
            fullName: u.name,
            email: u.email,
            status: "ACTIVE",
            companyId: u.companyId,
            updatedAt: new Date()
          }
        });
      }
    }
  }

  console.log("All default authentication accounts seeded and activated successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
