import { db } from "./lib/db";
import { verifyPassword } from "./lib/security";
import bcrypt from "bcryptjs";

async function testAuth() {
  console.log("==========================================");
  console.log("Testing Super Admin Auth in local DB...");
  
  const user = await db.user.findUnique({
    where: { email: "faizancheena9@gmail.com" }
  });

  if (!user) {
    console.log("❌ USER NOT FOUND IN DATABASE!");
    return;
  }

  console.log("User found in DB:");
  console.log("ID:", user.id);
  console.log("Email:", user.email);
  console.log("Role:", user.role);
  console.log("Status:", user.status);
  console.log("Password Hash:", user.password);

  const testPasswords = ["Cupoftea@9090", "Cupoftea@90"];
  for (const pw of testPasswords) {
    const { isValid } = await verifyPassword(pw, user.password || "");
    const bcryptCheck = user.password ? await bcrypt.compare(pw, user.password) : false;
    console.log(`Testing '${pw}': verifyPassword=${isValid}, bcryptMatch=${bcryptCheck}`);
  }
  console.log("==========================================");
}

testAuth().catch(console.error).finally(() => process.exit());
