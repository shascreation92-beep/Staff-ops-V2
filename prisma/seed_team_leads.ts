import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find Acme Corp company or first company
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

  const teamLeadsData = [
    { email: "tl1@acme.com", name: "John Lead" },
    { email: "tl2@acme.com", name: "Emma Lead" },
    { email: "tl3@acme.com", name: "David Lead" },
  ];

  for (const tl of teamLeadsData) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: tl.email }
    });

    if (existing) {
      console.log(`Team Lead ${tl.name} (${tl.email}) already exists.`);
      continue;
    }

    const newUserId = `tl-${tl.email.split("@")[0]}`;
    const newUser = await prisma.user.create({
      data: {
        id: newUserId,
        email: tl.email,
        name: tl.name,
        role: "TEAM_LEAD",
        status: "APPROVED",
        password: "pass123",
        companyId,
        updatedAt: new Date()
      }
    });

    // Create a corresponding active employee record so they are visible in employee list
    const newEmpId = `emp-${tl.email.split("@")[0]}`;
    await prisma.employee.create({
      data: {
        id: newEmpId,
        employeeId: `TL-${tl.email.split("@")[0].toUpperCase()}`,
        fullName: tl.name,
        email: tl.email,
        status: "ACTIVE",
        companyId,
        userId: newUserId,
        updatedAt: new Date()
      }
    });

    console.log(`Created Team Lead: ${tl.name} (${tl.email}) with bypass password "pass123"`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
