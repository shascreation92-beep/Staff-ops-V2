"use server";

import { db } from "@/lib/db";
import { enforceAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

/**
 * 1. Submit Employee Feedback or Suggestion
 */
export async function submitFeedbackAction(data: {
  category: "FEATURE_REQUEST" | "BUG_REPORT" | "SYSTEM_SPEED" | "SUGGESTION";
  rating: number;
  subject: string;
  message: string;
  attachmentUrl?: string;
}) {
  const user = await enforceAuth([
    "SUPER_ADMIN",
    "COMPANY_OWNER",
    "TEAM_LEAD",
    "SALES_ASSOCIATE",
    "IT_DEPARTMENT"
  ]);

  if (!data.subject || !data.message) {
    return { success: false, error: "Subject and detailed message are required." };
  }

  const newFeedback = await db.feedback.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      companyId: user.companyId || null,
      category: data.category || "SUGGESTION",
      rating: Math.min(5, Math.max(1, data.rating || 5)),
      subject: data.subject.trim(),
      message: data.message.trim(),
      attachmentUrl: data.attachmentUrl?.trim() || null,
      status: "NEW"
    }
  });

  // Notify Super Admins of new feedback submission
  try {
    const superAdmins = await db.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { id: true }
    });

    for (const sa of superAdmins) {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: sa.id,
          title: `💬 New Feedback: ${data.subject.slice(0, 30)}`,
          message: `${user.name || user.email} submitted a ${data.category.replace("_", " ")}: "${data.subject}"`,
          type: "SYSTEM_ALERT"
        }
      });
    }
  } catch (err) {
    console.error("Failed to create feedback notification:", err);
  }

  revalidatePath("/feedback");
  return { 
    success: true, 
    feedbackId: newFeedback.id,
    message: "Thank you! Your feedback has been submitted directly to Super Admin." 
  };
}

/**
 * 2. Fetch Personal Feedback History for Current User
 */
export async function getUserFeedbackHistoryAction() {
  const user = await enforceAuth([
    "SUPER_ADMIN",
    "COMPANY_OWNER",
    "TEAM_LEAD",
    "SALES_ASSOCIATE",
    "IT_DEPARTMENT"
  ]);

  const items = await db.feedback.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  return { success: true, history: items };
}

/**
 * 3. Fetch All Submissions for Super Admin & Company Owner
 */
export async function getAllFeedbackAction(filters?: {
  statusFilter?: string;
  categoryFilter?: string;
}) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  let companyFilter = {};
  if (user.role !== "SUPER_ADMIN" && user.companyId) {
    companyFilter = { companyId: user.companyId };
  }

  let whereClause: any = {
    ...companyFilter
  };

  if (filters?.statusFilter && filters.statusFilter !== "ALL") {
    whereClause.status = filters.statusFilter;
  }

  if (filters?.categoryFilter && filters.categoryFilter !== "ALL") {
    whereClause.category = filters.categoryFilter;
  }

  const items = await db.feedback.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          company: {
            select: {
              name: true
            }
          },
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
    }
  });

  return { success: true, feedbackList: items };
}

/**
 * 4. Update Feedback Status & Super Admin Reply
 */
export async function updateFeedbackStatusAction(data: {
  feedbackId: string;
  status: "NEW" | "IN_REVIEW" | "PLANNED" | "COMPLETED" | "DISMISSED";
  adminReply?: string;
}) {
  const admin = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  if (!data.feedbackId || !data.status) {
    return { success: false, error: "Missing required arguments." };
  }

  const updated = await db.feedback.update({
    where: { id: data.feedbackId },
    data: {
      status: data.status,
      adminReply: data.adminReply?.trim() || null,
      repliedAt: data.adminReply?.trim() ? new Date() : null,
      repliedBy: admin.name || admin.email
    }
  });

  // Create system notification for employee when status changes or reply is added
  try {
    if (updated.userId) {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: updated.userId,
          title: `📢 Update on your Feedback: ${updated.subject.slice(0, 25)}...`,
          message: `Super Admin updated status to "${data.status.replace("_", " ")}"${data.adminReply ? `: "${data.adminReply.slice(0, 60)}..."` : "."}`,
          type: "SYSTEM_ALERT"
        }
      });
    }
  } catch (err) {
    console.error("Failed to notify user of feedback status update:", err);
  }

  revalidatePath("/feedback");
  return { success: true, message: "Feedback status and reply updated successfully!" };
}

/**
 * 5. Delete Feedback Record
 */
export async function deleteFeedbackAction(feedbackId: string) {
  await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);
  if (!feedbackId) return { success: false, error: "Feedback ID required." };

  await db.feedback.delete({
    where: { id: feedbackId }
  });

  revalidatePath("/feedback");
  return { success: true };
}
