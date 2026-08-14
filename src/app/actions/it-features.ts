"use server";
import { db } from "@/lib/db";
import { enforceAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { encryptCredential } from "@/lib/security";

/**
 * 1. Issue a Remote IT Command (Restart Agent, Clear Cache, Flush DNS, Force Sync)
 */
export async function issueRemoteITCommandAction(data: {
  targetUserId: string;
  commandType: "RESTART_AGENT" | "CLEAR_CACHE" | "FLUSH_DNS" | "FORCE_SYNC";
}) {
  const admin = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);
  if (!data.targetUserId || !data.commandType) {
    return { success: false, error: "Missing required parameters." };
  }

  const targetUser = await db.user.findUnique({
    where: { id: data.targetUserId },
    select: { id: true, name: true, email: true, companyId: true }
  });

  if (!targetUser) {
    return { success: false, error: "Target user not found." };
  }

  const command = await db.remotecommand.create({
    data: {
      id: crypto.randomUUID(),
      userId: targetUser.id,
      companyId: targetUser.companyId,
      commandType: data.commandType,
      status: "PENDING",
      issuedBy: admin.name || admin.email
    }
  });

  revalidatePath("/it-management");
  revalidatePath("/workstation-telemetry");
  revalidatePath("/screen-telemetry");

  return { 
    success: true, 
    commandId: command.id,
    message: `Remote command '${data.commandType}' sent to ${targetUser.name || targetUser.email}'s workstation!`
  };
}

/**
 * 2. Fetch Unresolved Security Anti-Tamper Logs
 */
export async function getTamperLogsAction() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  let companyFilter = {};
  if (user.role !== "SUPER_ADMIN" && user.companyId) {
    companyFilter = { companyId: user.companyId };
  }

  const logs = await db.tamperlog.findMany({
    where: {
      ...companyFilter
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          employee: {
            select: {
              employeeId: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });

  return { success: true, tamperLogs: logs };
}

/**
 * Resolve a Tamper Alert
 */
export async function resolveTamperLogAction(logId: string) {
  await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);
  if (!logId) return { success: false, error: "Log ID required." };

  await db.tamperlog.update({
    where: { id: logId },
    data: { isResolved: true }
  });

  revalidatePath("/it-management");
  revalidatePath("/screen-telemetry");
  return { success: true };
}

/**
 * Record a Security Anti-Tamper Violation
 */
export async function recordTamperLogAction(data: {
  userId: string;
  reason: string;
  details?: string;
  severity?: "WARNING" | "HIGH" | "CRITICAL";
}) {
  const targetUser = await db.user.findFirst({
    where: {
      OR: [{ id: data.userId }, { email: data.userId }]
    }
  });

  if (!targetUser) return { success: false, error: "User not found." };

  const log = await db.tamperlog.create({
    data: {
      id: crypto.randomUUID(),
      userId: targetUser.id,
      companyId: targetUser.companyId,
      reason: data.reason,
      details: data.details || null,
      severity: data.severity || "HIGH"
    }
  });

  return { success: true, logId: log.id };
}

/**
 * 3. Laptop Equipment & Asset Inventory Management Actions
 */
export async function getLaptopAssetsAction() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  let companyFilter = {};
  if (user.role !== "SUPER_ADMIN" && user.companyId) {
    companyFilter = { companyId: user.companyId };
  }

  const assets = await db.laptopasset.findMany({
    where: {
      ...companyFilter
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          employee: {
            select: {
              employeeId: true
            }
          }
        }
      },
      company: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return { success: true, assets };
}

export async function createLaptopAssetAction(data: {
  assetTag: string;
  serialNumber: string;
  brand: string;
  model?: string;
  specsCpu?: string;
  specsRam?: string;
  specsStorage?: string;
  windowsVersion?: string;
  assigneeUserId?: string;
  laptopPassword?: string;
  vpnCredentials?: string;
  conditionStatus?: "EXCELLENT" | "GOOD" | "REPAIR_REQUIRED" | "ARCHIVED";
  repairNotes?: string;
}) {
  const admin = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  if (!data.assetTag || !data.serialNumber || !data.brand) {
    return { success: false, error: "Asset Tag, Serial Number, and Laptop Brand are required." };
  }

  let assignedCompanyId: string | null = admin.companyId || null;
  if (data.assigneeUserId) {
    const assignee = await db.user.findUnique({
      where: { id: data.assigneeUserId },
      select: { companyId: true }
    });
    if (assignee?.companyId) assignedCompanyId = assignee.companyId;
  }

  const asset = await db.laptopasset.create({
    data: {
      id: crypto.randomUUID(),
      assetTag: data.assetTag.trim(),
      serialNumber: data.serialNumber.trim(),
      brand: data.brand.trim(),
      model: data.model?.trim() || null,
      specsCpu: data.specsCpu?.trim() || null,
      specsRam: data.specsRam?.trim() || null,
      specsStorage: data.specsStorage?.trim() || null,
      windowsVersion: data.windowsVersion?.trim() || null,
      assigneeUserId: data.assigneeUserId || null,
      companyId: assignedCompanyId,
      laptopPassword: data.laptopPassword ? (encryptCredential(data.laptopPassword.trim()) || data.laptopPassword.trim()) : null,
      vpnCredentials: data.vpnCredentials ? (encryptCredential(data.vpnCredentials.trim()) || data.vpnCredentials.trim()) : null,
      conditionStatus: data.conditionStatus || "EXCELLENT",
      repairNotes: data.repairNotes?.trim() || null
    }
  });

  revalidatePath("/it-management");
  revalidatePath("/workstation-telemetry");
  return { success: true, asset };
}

export async function updateLaptopAssetAction(id: string, data: Partial<{
  assetTag: string;
  serialNumber: string;
  brand: string;
  model: string;
  specsCpu: string;
  specsRam: string;
  specsStorage: string;
  windowsVersion: string;
  assigneeUserId: string;
  laptopPassword: string;
  vpnCredentials: string;
  conditionStatus: "EXCELLENT" | "GOOD" | "REPAIR_REQUIRED" | "ARCHIVED";
  repairNotes: string;
}>) {
  await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);
  if (!id) return { success: false, error: "Asset ID is required." };

  const updatePayload = {
    ...data,
    ...(data.laptopPassword ? { laptopPassword: encryptCredential(data.laptopPassword.trim()) || data.laptopPassword.trim() } : {}),
    ...(data.vpnCredentials ? { vpnCredentials: encryptCredential(data.vpnCredentials.trim()) || data.vpnCredentials.trim() } : {}),
    updatedAt: new Date()
  };

  await db.laptopasset.update({
    where: { id },
    data: updatePayload
  });

  revalidatePath("/it-management");
  revalidatePath("/workstation-telemetry");
  return { success: true };
}

export async function deleteLaptopAssetAction(id: string) {
  await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);
  if (!id) return { success: false, error: "Asset ID required." };

  await db.laptopasset.delete({
    where: { id }
  });

  revalidatePath("/it-management");
  revalidatePath("/workstation-telemetry");
  return { success: true };
}
