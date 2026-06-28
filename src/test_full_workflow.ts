import { PrismaClient } from "@prisma/client";
import { createAccountAction, updateAccountStatusAction } from "./app/actions/accounts";

const db = new PrismaClient();

async function runActionSafely(actionFn: () => Promise<any>) {
  try {
    return await actionFn();
  } catch (err: any) {
    if (err.message.includes("static generation store missing in revalidatePath")) {
      // Ignore Next.js-specific warning when running standalone scripts
      return { success: true };
    }
    throw err;
  }
}

async function run() {
  console.log("=== STARTING FULL WORKFLOW TEST ===");

  // Find a valid active platform
  const platform = await db.platform.findFirst({
    where: { isArchived: false }
  });

  if (!platform) {
    throw new Error("No active platforms found in database.");
  }
  console.log(`Using Platform: ${platform.name} (${platform.id})`);

  // Hammad Arham's details
  const associateId = "78247019-a46e-4ff7-ac10-6a5324d7c5d2";
  const associateEmail = "Hammad@gmail.com";
  
  // Adeen (Team Lead) details
  const teamLeadId = "93d5b55f-6db3-4575-bc27-eec4c9529518";
  const teamLeadEmail = "adeen@gmail.com";

  // IT Member details
  const itId = "b79c45b7-dbed-4748-a66e-74fbb0873b73";
  const itEmail = "it@acme.com";

  // Step 1: Create 2 new accounts as Hammad Arham (Sales Associate)
  console.log("\nStep 1: Creating 2 new accounts for Hammad Arham...");
  process.env.MOCK_USER_ID = associateId;
  process.env.MOCK_USER_EMAIL = associateEmail;
  process.env.MOCK_USER_ROLE = "SALES_ASSOCIATE";

  const serial1 = `TEST-WF-${Math.floor(1000 + Math.random() * 9000)}`;
  const serial2 = `TEST-WF-${Math.floor(1000 + Math.random() * 9000)}`;

  await runActionSafely(() => createAccountAction({
    platformId: platform.id,
    serialCode: serial1,
    idName: "Workflow Test Acc 1",
    adsPublished: 5,
    verificationStatus: "No",
    submissionDate: new Date().toISOString().split("T")[0]
  }));

  await runActionSafely(() => createAccountAction({
    platformId: platform.id,
    serialCode: serial2,
    idName: "Workflow Test Acc 2",
    adsPublished: 6,
    verificationStatus: "No",
    submissionDate: new Date().toISOString().split("T")[0]
  }));

  // Fetch the created account records from DB
  const acc1 = await db.account.findUnique({ where: { serialCode: serial1 } });
  const acc2 = await db.account.findUnique({ where: { serialCode: serial2 } });

  if (!acc1 || !acc2) {
    throw new Error("Created accounts could not be retrieved from DB.");
  }
  console.log(`Created Account 1: ${acc1.id} (serial: ${acc1.serialCode}, status: ${acc1.status})`);
  console.log(`Created Account 2: ${acc2.id} (serial: ${acc2.serialCode}, status: ${acc2.status})`);

  // Step 2: Submit requests to TL (transitions to PENDING_TL)
  console.log("\nStep 2: Submitting account requests to TL (Adeen)...");
  await runActionSafely(() => updateAccountStatusAction(acc1.id, "PENDING_TL", "Request to TL submitted by Associate"));
  await runActionSafely(() => updateAccountStatusAction(acc2.id, "PENDING_TL", "Request to TL submitted by Associate"));

  // Verify status in DB
  const verifyStep2Acc1 = await db.account.findUnique({ where: { id: acc1.id } });
  const verifyStep2Acc2 = await db.account.findUnique({ where: { id: acc2.id } });
  console.log(`Account 1 status: ${verifyStep2Acc1?.status} (Expected: PENDING_TL)`);
  console.log(`Account 2 status: ${verifyStep2Acc2?.status} (Expected: PENDING_TL)`);

  if (verifyStep2Acc1?.status !== "PENDING_TL" || verifyStep2Acc2?.status !== "PENDING_TL") {
    throw new Error("Failed to transition status to PENDING_TL");
  }

  // Step 3: Approve requests as Team Lead (Adeen) (transitions to FORWARDED_TO_IT)
  console.log("\nStep 3: Approving requests as Team Lead (Adeen)...");
  process.env.MOCK_USER_ID = teamLeadId;
  process.env.MOCK_USER_EMAIL = teamLeadEmail;
  process.env.MOCK_USER_ROLE = "TEAM_LEAD";

  await runActionSafely(() => updateAccountStatusAction(acc1.id, "FORWARDED_TO_IT", "Approved by Team Lead"));
  await runActionSafely(() => updateAccountStatusAction(acc2.id, "FORWARDED_TO_IT", "Approved by Team Lead"));

  // Verify status in DB
  const verifyStep3Acc1 = await db.account.findUnique({ where: { id: acc1.id } });
  const verifyStep3Acc2 = await db.account.findUnique({ where: { id: acc2.id } });
  console.log(`Account 1 status: ${verifyStep3Acc1?.status} (Expected: FORWARDED_TO_IT)`);
  console.log(`Account 2 status: ${verifyStep3Acc2?.status} (Expected: FORWARDED_TO_IT)`);

  if (verifyStep3Acc1?.status !== "FORWARDED_TO_IT" || verifyStep3Acc2?.status !== "FORWARDED_TO_IT") {
    throw new Error("Failed to transition status to FORWARDED_TO_IT");
  }

  // Step 4: Accept requests as IT Department (transitions to IT_PENDING)
  console.log("\nStep 4: Accepting requests as IT Department...");
  process.env.MOCK_USER_ID = itId;
  process.env.MOCK_USER_EMAIL = itEmail;
  process.env.MOCK_USER_ROLE = "IT_DEPARTMENT";

  await runActionSafely(() => updateAccountStatusAction(acc1.id, "IT_PENDING", "Accepted by IT Department"));
  await runActionSafely(() => updateAccountStatusAction(acc2.id, "IT_PENDING", "Accepted by IT Department"));

  // Verify status in DB
  const verifyStep4Acc1 = await db.account.findUnique({ where: { id: acc1.id } });
  const verifyStep4Acc2 = await db.account.findUnique({ where: { id: acc2.id } });
  console.log(`Account 1 status: ${verifyStep4Acc1?.status} (Expected: IT_PENDING)`);
  console.log(`Account 2 status: ${verifyStep4Acc2?.status} (Expected: IT_PENDING)`);

  if (verifyStep4Acc1?.status !== "IT_PENDING" || verifyStep4Acc2?.status !== "IT_PENDING") {
    throw new Error("Failed to transition status to IT_PENDING");
  }

  // Step 5: Sort and resolve requests as IT Department (transitions to SORTED)
  console.log("\nStep 5: Sorting and resolving requests as IT Department...");
  await runActionSafely(() => updateAccountStatusAction(acc1.id, "SORTED", "Sorted and resolved by IT Department"));
  await runActionSafely(() => updateAccountStatusAction(acc2.id, "SORTED", "Sorted and resolved by IT Department"));

  // Verify status in DB
  const verifyStep5Acc1 = await db.account.findUnique({ where: { id: acc1.id } });
  const verifyStep5Acc2 = await db.account.findUnique({ where: { id: acc2.id } });
  console.log(`Account 1 status: ${verifyStep5Acc1?.status} (Expected: SORTED)`);
  console.log(`Account 2 status: ${verifyStep5Acc2?.status} (Expected: SORTED)`);

  if (verifyStep5Acc1?.status !== "SORTED" || verifyStep5Acc2?.status !== "SORTED") {
    throw new Error("Failed to transition status to SORTED");
  }

  console.log("\n=== ALL STEPS COMPLETED SUCCESSFULLY ===");
}

run()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
  });
