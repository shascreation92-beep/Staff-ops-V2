"use server";

import { db } from "@/lib/db";
import { enforceAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

/**
 * Automatically purges screenshots and database rows older than 7 days
 */
async function autoCleanOldScreenshotsInternal() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Fetch expired snapshots to remove physical files
    const expiredSnapshots = await db.screensnapshot.findMany({
      where: {
        capturedAt: {
          lt: sevenDaysAgo
        }
      },
      select: {
        id: true,
        imageUrl: true
      }
    });

    // 2. Remove files from public directory
    for (const snap of expiredSnapshots) {
      if (snap.imageUrl && snap.imageUrl.startsWith("/uploads/")) {
        const filePath = path.join(process.cwd(), "public", snap.imageUrl);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.warn(`[AutoClean] Failed to delete expired file ${filePath}:`, err);
          }
        }
      }
    }

    // 3. Delete database records
    if (expiredSnapshots.length > 0) {
      await db.screensnapshot.deleteMany({
        where: {
          capturedAt: {
            lt: sevenDaysAgo
          }
        }
      });
      console.log(`[AutoClean 7-Day Retention] Successfully purged ${expiredSnapshots.length} expired screenshots.`);
    }
  } catch (error) {
    console.error("[AutoClean] Error during 7-day storage retention cleanup:", error);
  }
}

/**
 * Server action to upload a 40-second desktop screenshot
 */
export async function uploadScreenshotAction(data: {
  base64Image: string;
  dutyStatus?: string;
  isIdle?: boolean;
  source?: string;
  userId?: string;
  secretToken?: string;
}) {
  let user: any = null;

  if (data.userId && data.secretToken) {
    const expectedToken = process.env.STAFFOPS_SECRET_TOKEN || "staffops_agent_token";
    if (data.secretToken !== expectedToken) {
      return { success: false, error: "Invalid Desktop Agent Secret Token." };
    }

    // Desktop Agent authentication: lookup by ID or Email
    const dbUser = await db.user.findFirst({
      where: {
        OR: [
          { id: data.userId },
          { email: data.userId }
        ]
      }
    });
    if (!dbUser || dbUser.isArchived || dbUser.status === "BLOCKED") {
      return { success: false, error: "Unauthorized Desktop Agent." };
    }
    user = dbUser;
  } else {
    // Web App Session authentication
    user = await enforceAuth();
  }

  try {
    const userId = user.id;
    const companyId = user.companyId || null;
    const base64Data = data.base64Image;

    if (!base64Data || !base64Data.includes("base64,")) {
      return { success: false, error: "Invalid image payload." };
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return { success: false, error: "Malformed base64 image data." };
    }

    const mimeType = matches[1].toLowerCase();
    const rawBuffer = Buffer.from(matches[2], "base64");
    const dateFolder = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const uploadDir = path.join(process.cwd(), "public", "uploads", "telemetry", userId, dateFolder);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let finalBuffer = rawBuffer;
    let ext = "webp";

    try {
      const sharp = (await import("sharp")).default;
      finalBuffer = await sharp(rawBuffer)
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      ext = "webp";
    } catch (e) {
      ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : (mimeType.includes("png") ? "png" : "webp");
      console.warn("Sharp WebP compression fallback:", e);
    }

    const fileName = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const fullPath = path.join(uploadDir, fileName);
    fs.writeFileSync(fullPath, finalBuffer);

    const relativeUrl = `/uploads/telemetry/${userId}/${dateFolder}/${fileName}`;

    // Record entry in database
    const snapshot = await db.screensnapshot.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        companyId,
        imageUrl: relativeUrl,
        capturedAt: new Date(),
        dutyStatus: data.dutyStatus || user.dutyStatus || "ON_DUTY",
        isIdle: data.isIdle || false,
        source: data.source || "DESKTOP_AGENT"
      }
    });

    // Run background 7-day auto retention cleanup asynchronously
    autoCleanOldScreenshotsInternal().catch(() => {});

    return { success: true, snapshotId: snapshot.id, imageUrl: relativeUrl };
  } catch (error: any) {
    console.error("Failed to upload screenshot:", error);
    return { success: false, error: error.message || "Failed to process screenshot upload." };
  }
}

/**
 * Report a Screen Monitoring Tamper / Disconnection Violation
 */
export async function reportTamperViolationAction(data: {
  reason: string;
  details?: string;
  targetUserId?: string;
}) {
  let user: any = null;
  if (data.targetUserId) {
    user = await db.user.findUnique({ where: { id: data.targetUserId } });
  }
  if (!user) {
    user = await enforceAuth().catch(() => null);
  }

  if (!user) {
    return { success: false, error: "User context not identified." };
  }

  try {
    const companyId = user.companyId || null;

    // Create Tamper Log entry
    const tamperRecord = await db.tamperlog.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        companyId,
        reason: data.reason,
        details: data.details || `User ${user.name || user.email} stopped screen monitoring or closed session while On Duty.`,
        severity: "HIGH",
        isResolved: false,
        createdAt: new Date()
      }
    });

    // Notify Company Owner(s) and IT Department
    const notifyRecipients = await db.user.findMany({
      where: {
        companyId: companyId || undefined,
        role: { in: ["COMPANY_OWNER", "SUPER_ADMIN", "IT_DEPARTMENT"] },
        isArchived: false,
        status: "APPROVED"
      },
      select: { id: true, role: true }
    });

    for (const recipient of notifyRecipients) {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: recipient.id,
          title: "🚨 Screen Monitoring Tamper Alert",
          message: `VIOLATION ALERT: ${user.name || user.email} (${user.role.replace("_", " ")}) stopped desktop monitoring while On Duty! (${data.reason})`,
          type: "IT_READ_ONLY",
          isRead: false
        }
      });
    }

    revalidatePath("/attendance");
    revalidatePath("/screen-telemetry");
    return { success: true, logId: tamperRecord.id };
  } catch (error: any) {
    console.error("Failed to report tamper violation:", error);
    return { success: false, error: error.message || "Failed to log tamper violation." };
  }
}

/**
 * Fetch company screen audit snapshots
 */
export async function getCompanyScreenshotsAction(params?: {
  targetUserId?: string;
  dateStr?: string; // YYYY-MM-DD
}) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  let companyFilter: any = {};
  if (currentUser.role !== "SUPER_ADMIN") {
    companyFilter = { companyId: currentUser.companyId };
  }

  if (params?.targetUserId) {
    companyFilter.userId = params.targetUserId;
  }

  let dateFilter: any = {};
  if (params?.dateStr) {
    const startOfDay = new Date(`${params.dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${params.dateStr}T23:59:59.999Z`);
    dateFilter = {
      capturedAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    };
  }

  const snapshots = await db.screensnapshot.findMany({
    where: {
      ...companyFilter,
      ...dateFilter
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          employee: {
            select: {
              employeeId: true
            }
          }
        }
      }
    },
    orderBy: {
      capturedAt: "desc"
    },
    take: 300
  });

  const snapshotsWithMeta = snapshots.map(s => {
    let formattedSize = "120 KB";
    try {
      if (s.imageUrl && s.imageUrl.startsWith("/uploads/")) {
        const fullPath = path.join(process.cwd(), "public", s.imageUrl.replace(/^\//, "").replace(/\//g, path.sep));
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          const bytes = stats.size;
          if (bytes >= 1024 * 1024) {
            formattedSize = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
          } else {
            formattedSize = `${Math.round(bytes / 1024)} KB`;
          }
        }
      }
    } catch (e) {}

    return {
      ...s,
      fileSizeFormatted: formattedSize
    };
  });

  return { success: true, snapshots: snapshotsWithMeta };
}

/**
 * Fetch tamper logs for Company Owner and IT
 */
export async function getTamperLogsAction() {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT", "TEAM_LEAD"]);

  let companyFilter: any = {};
  if (currentUser.role !== "SUPER_ADMIN") {
    companyFilter = { companyId: currentUser.companyId };
  }

  const logs = await db.tamperlog.findMany({
    where: companyFilter,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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
    take: 50
  });

  return { success: true, logs };
}

/**
 * Manually trigger 7-day retention cleanup
 */
export async function manualCleanOldScreenshotsAction() {
  await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);
  await autoCleanOldScreenshotsInternal();
  revalidatePath("/screen-telemetry");
  return { success: true };
}

/**
 * Get live monitoring status (ACTIVE, IDLE, INTERRUPTED, OFF_DUTY) for company users
 */
export async function getUsersMonitoringStatusAction() {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "IT_DEPARTMENT", "SALES_ASSOCIATE"]);

  let companyFilter: any = {};
  if (currentUser.role !== "SUPER_ADMIN") {
    companyFilter = { companyId: currentUser.companyId };
  }

  const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);

  // Fetch all active users in company
  const users = await db.user.findMany({
    where: {
      ...companyFilter,
      isArchived: false,
      status: "APPROVED"
    },
    select: {
      id: true,
      dutyStatus: true,
      name: true,
      email: true
    }
  });

  // Fetch latest snapshots
  const latestSnapshots = await db.screensnapshot.findMany({
    where: {
      ...companyFilter,
      capturedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    orderBy: {
      capturedAt: "desc"
    },
    take: 500
  });

  const userStatusMap: Record<string, {
    status: "ACTIVE" | "IDLE" | "INTERRUPTED" | "OFF_DUTY";
    lastCapturedAt: string | null;
  }> = {};

  for (const u of users) {
    const snap = latestSnapshots.find(s => s.userId === u.id);
    if (!snap) {
      userStatusMap[u.id] = {
        status: u.dutyStatus === "ON_DUTY" ? "INTERRUPTED" : "OFF_DUTY",
        lastCapturedAt: null
      };
      continue;
    }

    const capturedDate = new Date(snap.capturedAt);
    const isRecent = capturedDate >= ninetySecondsAgo;

    if (isRecent) {
      userStatusMap[u.id] = {
        status: snap.isIdle ? "IDLE" : "ACTIVE",
        lastCapturedAt: capturedDate.toISOString()
      };
    } else if (u.dutyStatus === "ON_DUTY") {
      userStatusMap[u.id] = {
        status: "INTERRUPTED",
        lastCapturedAt: capturedDate.toISOString()
      };
    } else {
      userStatusMap[u.id] = {
        status: "OFF_DUTY",
        lastCapturedAt: capturedDate.toISOString()
      };
    }
  }

  return { success: true, userStatusMap };
}

/**
 * Delete selective or bulk screenshots by snapshot IDs (deletes database records AND physical files from disk)
 */
export async function deleteScreenshotsAction(snapshotIds: string[]) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  if (!snapshotIds || snapshotIds.length === 0) {
    return { success: false, error: "No screenshots selected for deletion." };
  }

  // Find snapshots to delete
  const snapshots = await db.screensnapshot.findMany({
    where: {
      id: { in: snapshotIds },
      ...(currentUser.role !== "SUPER_ADMIN" ? { companyId: currentUser.companyId } : {})
    },
    select: {
      id: true,
      imageUrl: true
    }
  });

  if (snapshots.length === 0) {
    return { success: false, error: "No matching screenshots found." };
  }

  // Delete physical files from disk to free VPS storage space
  for (const s of snapshots) {
    try {
      if (s.imageUrl && s.imageUrl.startsWith("/uploads/")) {
        const fullPath = path.join(process.cwd(), "public", s.imageUrl.replace(/^\//, "").replace(/\//g, path.sep));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch (e) {
      console.warn("Failed to delete physical screenshot file:", s.imageUrl, e);
    }
  }

  // Delete database records
  await db.screensnapshot.deleteMany({
    where: {
      id: { in: snapshots.map(s => s.id) }
    }
  });

  revalidatePath("/screen-telemetry");
  return { success: true, count: snapshots.length };
}
