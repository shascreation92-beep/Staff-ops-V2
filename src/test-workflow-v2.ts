import { db } from "./lib/db";
import { updateAccountStatusAction } from "./app/actions/accounts";

async function runTest() {
  console.log("=== START INTEGRATION WORKFLOW V2 TEST ===");

  // Find the IT user ID from the database
  const itUser = await db.user.findFirst({
    where: { email: "it@acme.com" }
  });
  if (!itUser) {
    console.error("FAIL: Could not find IT user in database!");
    return;
  }

  // 1. Reset account TT9090 to DRAFT
  console.log("1. Resetting account TT9090 status to DRAFT...");
  const account = await db.account.update({
    where: { serialCode: "TT9090" },
    data: {
      status: "DRAFT",
      teamLeadId: "93d5b55f-6db3-4575-bc27-eec4c9529518", // Mapped to Adeen / Udeen
      associateId: "Hammad Arham"
    }
  });
  console.log(`Account Reset Status: ${account.status}`);

  // 2. Simulate Hammad clicking 'Request to TL' -> PENDING_TL
  console.log("\n2. Simulating Hammad (Associate) clicking 'Request to TL'...");
  process.env.MOCK_USER_ID = "78247019-a46e-4ff7-ac10-6a5324d7c5d2"; // Hammad Arham
  process.env.MOCK_USER_EMAIL = "hammad@gmail.com";
  process.env.MOCK_USER_ROLE = "SALES_ASSOCIATE";

  try {
    await updateAccountStatusAction(account.id, "PENDING_TL", "Request to TL submitted by Associate");
  } catch (err: any) {
    if (!err.message.includes("static generation store missing")) {
      console.error("Hammad action failed:", err.message);
      return;
    }
  }

  let currentAccount = await db.account.findUnique({ where: { id: account.id } });
  console.log(`Status after Hammad click: ${currentAccount?.status} (Expected: PENDING_TL)`);
  if (currentAccount?.status !== "PENDING_TL") {
    console.error("FAIL: Status is not PENDING_TL!");
    return;
  }

  // 3. Simulate Udeen rejecting the request -> REJECTED
  console.log("\n3. Simulating Udeen (Team Lead) rejecting the request...");
  process.env.MOCK_USER_ID = "93d5b55f-6db3-4575-bc27-eec4c9529518"; // Adeen / Udeen ID
  process.env.MOCK_USER_EMAIL = "adeen@gmail.com";
  process.env.MOCK_USER_ROLE = "TEAM_LEAD";

  try {
    await updateAccountStatusAction(account.id, "REJECTED", "Rejected by Team Lead");
  } catch (err: any) {
    if (!err.message.includes("static generation store missing")) {
      console.error("Udeen reject action failed:", err.message);
      return;
    }
  }

  currentAccount = await db.account.findUnique({ where: { id: account.id } });
  console.log(`Status after Udeen reject: ${currentAccount?.status} (Expected: REJECTED)`);
  if (currentAccount?.status !== "REJECTED") {
    console.error("FAIL: Status is not REJECTED!");
    return;
  }

  // 4. Simulate Hammad re-requesting after rejection -> PENDING_TL
  console.log("\n4. Simulating Hammad (Associate) re-requesting after rejection...");
  process.env.MOCK_USER_ID = "78247019-a46e-4ff7-ac10-6a5324d7c5d2";
  process.env.MOCK_USER_EMAIL = "hammad@gmail.com";
  process.env.MOCK_USER_ROLE = "SALES_ASSOCIATE";

  try {
    await updateAccountStatusAction(account.id, "PENDING_TL", "Re-requesting after TL rejection");
  } catch (err: any) {
    if (!err.message.includes("static generation store missing")) {
      console.error("Hammad re-request action failed:", err.message);
      return;
    }
  }

  currentAccount = await db.account.findUnique({ where: { id: account.id } });
  console.log(`Status after Hammad re-request: ${currentAccount?.status} (Expected: PENDING_TL)`);
  if (currentAccount?.status !== "PENDING_TL") {
    console.error("FAIL: Status is not PENDING_TL!");
    return;
  }

  // 5. Simulate Udeen approving the request -> FORWARDED_TO_IT
  console.log("\n5. Simulating Udeen (Team Lead) approving the request...");
  process.env.MOCK_USER_ID = "93d5b55f-6db3-4575-bc27-eec4c9529518";
  process.env.MOCK_USER_EMAIL = "adeen@gmail.com";
  process.env.MOCK_USER_ROLE = "TEAM_LEAD";

  try {
    await updateAccountStatusAction(account.id, "FORWARDED_TO_IT", "Approved by Team Lead");
  } catch (err: any) {
    if (!err.message.includes("static generation store missing")) {
      console.error("Udeen approval action failed:", err.message);
      return;
    }
  }

  currentAccount = await db.account.findUnique({ where: { id: account.id } });
  console.log(`Status after Udeen approval: ${currentAccount?.status} (Expected: FORWARDED_TO_IT)`);
  if (currentAccount?.status !== "FORWARDED_TO_IT") {
    console.error("FAIL: Status is not FORWARDED_TO_IT!");
    return;
  }

  // 6. Simulate IT Department clicking 'Sort' -> SORTED
  console.log("\n6. Simulating IT Department clicking 'Sort'...");
  process.env.MOCK_USER_ID = itUser.id;
  process.env.MOCK_USER_EMAIL = "it@acme.com";
  process.env.MOCK_USER_ROLE = "IT_DEPARTMENT";

  try {
    await updateAccountStatusAction(account.id, "SORTED", "Sorted and resolved by IT Department");
  } catch (err: any) {
    if (!err.message.includes("static generation store missing")) {
      console.error("IT sort action failed:", err.message);
      return;
    }
  }

  currentAccount = await db.account.findUnique({ where: { id: account.id } });
  console.log(`Status after IT sort: ${currentAccount?.status} (Expected: SORTED)`);
  if (currentAccount?.status === "SORTED") {
    console.log("\nSUCCESS: Multi-stage status update workflow is working perfectly!");
  } else {
    console.error("FAIL: Status is not SORTED!");
  }
}

// Enable environmental mock mode in auth-helpers
process.env.MOCK_USER_ROLE = "MOCK";
runTest()
  .catch(console.error)
  .finally(() => {
    delete process.env.MOCK_USER_ID;
    delete process.env.MOCK_USER_EMAIL;
    delete process.env.MOCK_USER_ROLE;
  });
