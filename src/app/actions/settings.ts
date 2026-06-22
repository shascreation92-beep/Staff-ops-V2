"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth, logAction } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { z } from "zod";

// Create Platform Zod Schema
const PlatformSchema = z.object({
  name: z.string().min(1, "Platform name is required"),
});

export async function addPlatformAction(formData: z.infer<typeof PlatformSchema>) {
  const user = await enforceAuth(["SUPER_ADMIN"]);

  const result = PlatformSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { name } = result.data;

  // Check duplicate platform
  const existing = await db.platform.findFirst({
    where: { name, isArchived: false }
  });
  if (existing) {
    throw new Error(`Platform "${name}" already exists.`);
  }

  try {
    const newPlatform = await db.platform.create({
      data: {
        id: crypto.randomUUID(),
        name,
        updatedAt: new Date()
      }
    });

    // Write audit log
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "CREATE",
      entity: "platform",
      entityId: newPlatform.id,
      newValue: name
    });

    revalidatePath("/settings");
    revalidatePath("/accounts");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to create platform.");
  }
}

export async function archivePlatformAction(id: string) {
  const user = await enforceAuth(["SUPER_ADMIN"]);

  try {
    await db.platform.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: user.email || "",
        updatedAt: new Date()
      }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "ARCHIVE",
      entity: "platform",
      entityId: id
    });

    revalidatePath("/settings");
    revalidatePath("/accounts");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete platform.");
  }
}

// Announcements Actions
const AnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  targetCompanyId: z.string().optional() // nullable for global announcements
});

export async function createAnnouncementAction(formData: z.infer<typeof AnnouncementSchema>) {
  const user = await enforceAuth(["SUPER_ADMIN"]);

  const result = AnnouncementSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { title, content, targetCompanyId } = result.data;
  const annId = crypto.randomUUID();

  try {
    const newAnn = await db.announcement.create({
      data: {
        id: annId,
        title,
        content,
        createdById: user.id,
        companyId: targetCompanyId || null
      }
    });

    // Write audit log
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "CREATE",
      entity: "announcement",
      entityId: annId,
      newValue: JSON.stringify(newAnn)
    });

    // Notify target users
    const usersToNotify = await db.user.findMany({
      where: {
        isArchived: false,
        status: "APPROVED",
        companyId: targetCompanyId || undefined
      }
    });

    for (const targetUser of usersToNotify) {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: targetUser.id,
          title: `Announcement: ${title}`,
          message: content.slice(0, 150),
          type: "Announcement",
          isRead: false
        }
      });
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to distribute announcement.");
  }
}

// Update Company Rule Action
const RuleSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  targetCompanyId: z.string().optional() // For Super Admin override
});

export async function updateCompanyRuleAction(formData: z.infer<typeof RuleSchema>) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  const result = RuleSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { key, value, targetCompanyId } = result.data;

  // Determine target company context
  let companyId = user.companyId;
  if (user.role === "SUPER_ADMIN") {
    if (!targetCompanyId) {
      throw new Error("Target company ID is required for Super Admin.");
    }
    companyId = targetCompanyId;
  }

  if (!companyId) {
    throw new Error("No company context found.");
  }

  // Define display name mapping
  let name = key;
  if (key === "minAds") name = "Minimum Ads Required";
  if (key === "requireVerification") name = "Verification Required";

  try {
    const existingRule = await db.rule.findUnique({
      where: {
        key_companyId: { key, companyId }
      }
    });

    if (existingRule) {
      await db.rule.update({
        where: { id: existingRule.id },
        data: { value, updatedAt: new Date() }
      });
    } else {
      await db.rule.create({
        data: {
          id: crypto.randomUUID(),
          name,
          key,
          value,
          companyId,
          updatedAt: new Date()
        }
      });
    }

    // Write audit log
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "UPDATE_RULE",
      entity: "rule",
      entityId: key,
      oldValue: existingRule?.value || "Default",
      newValue: value
    });

    revalidatePath("/settings");
    revalidatePath("/accounts");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update rule.");
  }
}
