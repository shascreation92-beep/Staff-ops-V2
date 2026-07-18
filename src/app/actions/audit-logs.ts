"use server";

import { db } from "@/lib/db";
import { enforceAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export async function clearAuditLogsAction() {
  // Only SUPER_ADMIN can clear audit logs
  await enforceAuth(["SUPER_ADMIN"]);

  try {
    // Delete all logs from database
    await db.auditlog.deleteMany({});
    await db.loginlog.deleteMany({});
    
    revalidatePath("/audit-logs");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to clear logs.");
  }
}
