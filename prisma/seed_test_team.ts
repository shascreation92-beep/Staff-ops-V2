import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { isArchived: false }
  });

  if (!company) {
    console.error("No active company found to seed team leads.");
    return;
  }

  const companyId = company.id;
  console.log(`Using Company: ${company.name} (${companyId})`);

  const tlEmail = "testtl@acme.com";
  const tlName = "Test Team Leader";
  const tlEmployeeId = "TL-TEST-100";
  const tlUserId = "tl-test-user-id";

  const saEmail = "testsa@acme.com";
  const saName = "Test Sales Associate";
  const saEmployeeId = "SA-TEST-100";
  const saUserId = "sa-test-user-id";

  // Clean up existing test records
  await prisma.employee.deleteMany({
    where: {
      OR: [
        { employeeId: tlEmployeeId },
        { employeeId: saEmployeeId },
        { email: tlEmail },
        { email: saEmail }
      ]
    }
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: tlEmail },
        { email: saEmail }
      ]
    }
  });

  console.log("Cleanup completed.");

  // 1. Create Test Team Leader
  await prisma.user.create({
    data: {
      id: tlUserId,
      email: tlEmail,
      name: tlName,
      role: "TEAM_LEAD",
      status: "APPROVED",
      password: "tlpass123",
      companyId,
      updatedAt: new Date()
    }
  });

  await prisma.employee.create({
    data: {
      id: "emp-tl-test-id",
      employeeId: tlEmployeeId,
      fullName: tlName,
      email: tlEmail,
      status: "ACTIVE",
      companyId,
      userId: tlUserId,
      updatedAt: new Date()
    }
  });

  console.log(`Created Team Lead: ${tlName} (${tlEmail})`);

  // 2. Create Test Sales Associate mapped to Test Team Leader
  await prisma.user.create({
    data: {
      id: saUserId,
      email: saEmail,
      name: saName,
      role: "SALES_ASSOCIATE",
      status: "APPROVED", // Mapped associate directly approved for testing display
      password: "sapass123",
      companyId,
      teamLeadId: tlUserId,
      updatedAt: new Date()
    }
  });

  await prisma.employee.create({
    data: {
      id: "emp-sa-test-id",
      employeeId: saEmployeeId,
      fullName: saName,
      email: saEmail,
      status: "ACTIVE",
      companyId,
      userId: saUserId,
      updatedAt: new Date()
    }
  });

  console.log(`Created Sales Associate: ${saName} (${saEmail}) assigned to Team Lead ${tlName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
