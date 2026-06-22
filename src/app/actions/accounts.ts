"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth, getCompanyFilter, logAction } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { account_status, user_role } from "@prisma/client";
import { z } from "zod";

// Zod schemas for validation
const CreateAccountSchema = z.object({
  platformId: z.string().min(1, "Platform is required"),
  serialCode: z.string().min(1, "Serial Code is required"),
  idName: z.string().min(1, "ID Name is required"),
  adsPublished: z.number().nonnegative("Ads count must be non-negative"),
  verificationStatus: z.enum(["Yes", "No"]),
  targetCompanyId: z.string().optional() // For Super Admin
});

export async function createAccountAction(formData: z.infer<typeof CreateAccountSchema>) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE"]);

  // Validation
  const result = CreateAccountSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { platformId, serialCode, idName, adsPublished, verificationStatus, targetCompanyId } = result.data;

  // Determine Company ID based on role
  let companyId = user.companyId;
  if (user.role === "SUPER_ADMIN") {
    if (!targetCompanyId) {
      throw new Error("Target company is required for Super Admin.");
    }
    companyId = targetCompanyId;
  }

  if (!companyId) {
    throw new Error("No company context found.");
  }

  // Check global uniqueness of serial code
  const existingSerial = await db.account.findUnique({
    where: { serialCode },
  });

  if (existingSerial) {
    throw new Error(`Serial Code "${serialCode}" is already in use globally. It must be unique.`);
  }

  const accountId = crypto.randomUUID();

  try {
    const newAccount = await db.account.create({
      data: {
        id: accountId,
        platformId,
        serialCode,
        idName,
        adsPublished,
        verificationStatus,
        status: "DRAFT",
        companyId,
        createdById: user.id,
        updatedById: user.id,
        updatedAt: new Date(),
      },
    });

    // Log the creation
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "CREATE",
      entity: "account",
      entityId: accountId,
      newValue: JSON.stringify(newAccount)
    });

    // Create workflow history
    await db.accounthistory.create({
      data: {
        id: crypto.randomUUID(),
        accountId,
        fromStatus: null,
        toStatus: "DRAFT",
        changedById: user.id,
        notes: "Account provisioned."
      }
    });

    revalidatePath("/accounts");
    return { success: true, accountId };
  } catch (error: any) {
    throw new Error(error.message || "Failed to create account.");
  }
}

export async function updateAccountStatusAction(
  accountId: string, 
  toStatus: account_status, 
  notes?: string
) {
  const user = await enforceAuth();

  const account = await db.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  // Multi-tenant check
  if (user.role !== "SUPER_ADMIN" && account.companyId !== user.companyId) {
    throw new Error("UNAUTHORIZED: Access to another company's account is forbidden.");
  }

  const fromStatus = account.status;

  // Workflow State Validation based on roles
  if (user.role === "SALES_ASSOCIATE") {
    // Sales Associates can transition DRAFT -> SUBMITTED, or edits to own
    if (fromStatus !== "DRAFT" && fromStatus !== "REJECTED") {
      throw new Error("UNAUTHORIZED: Sales Associates can only submit Draft or Rejected accounts.");
    }
    if (toStatus !== "SUBMITTED" && toStatus !== "DRAFT") {
      throw new Error("Invalid transition: Sales Associates can only transition to Draft or Submitted.");
    }
  }

  if (user.role === "TEAM_LEAD") {
    // Team Lead can approve or reject submitted/under review accounts
    const validFrom = ["SUBMITTED", "UNDER_REVIEW"];
    if (!validFrom.includes(fromStatus)) {
      throw new Error("Invalid transition: Team Leads can only review submitted or under-review accounts.");
    }
    if (toStatus !== "APPROVED_BY_TEAM_LEAD" && toStatus !== "REJECTED" && toStatus !== "UNDER_REVIEW") {
      throw new Error("Invalid transition: Team Leads can only Approve, Reject, or hold Under Review.");
    }
  }

  if (user.role === "IT_DEPARTMENT") {
    // IT Department manages laptops/VPN assignments and shifts progress
    const validFrom = ["APPROVED_BY_TEAM_LEAD", "ASSIGNED_TO_IT", "IN_PROGRESS"];
    if (!validFrom.includes(fromStatus)) {
      throw new Error("Invalid transition: IT department can only process approved or in-progress tickets.");
    }
    if (!["ASSIGNED_TO_IT", "IN_PROGRESS", "COMPLETED", "ACTIVE"].includes(toStatus)) {
      throw new Error("Invalid transition: IT department can only transition to In Progress, Completed, or Active.");
    }
  }

  try {
    const updatedAccount = await db.account.update({
      where: { id: accountId },
      data: {
        status: toStatus,
        updatedById: user.id,
        updatedAt: new Date()
      }
    });

    // Create workflow history
    await db.accounthistory.create({
      data: {
        id: crypto.randomUUID(),
        accountId,
        fromStatus,
        toStatus,
        changedById: user.id,
        notes: notes || `Status updated from ${fromStatus} to ${toStatus}.`
      }
    });

    // Write audit log
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "UPDATE_STATUS",
      entity: "account",
      entityId: accountId,
      oldValue: fromStatus,
      newValue: toStatus
    });

    // Trigger Notification for transitions
    if (toStatus === "APPROVED_BY_TEAM_LEAD") {
      // Find IT users in the company to notify
      const itUsers = await db.user.findMany({
        where: {
          companyId: account.companyId,
          role: "IT_DEPARTMENT",
          status: "APPROVED"
        }
      });

      for (const itUser of itUsers) {
        await db.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: itUser.id,
            title: "New Account Assigned to IT",
            message: `Account serial ${account.serialCode} has been approved by Team Lead and requires IT provisioning.`,
            type: "Task Assignment",
            isRead: false
          }
        });
      }
    } else if (toStatus === "ASSIGNED_TO_IT") {
      const lastApproval = await db.accounthistory.findFirst({
        where: {
          accountId: accountId,
          toStatus: "APPROVED_BY_TEAM_LEAD"
        },
        orderBy: {
          createdAt: "desc"
        },
        select: {
          changedById: true
        }
      });

      const creator = await db.user.findUnique({
        where: { id: account.createdById },
        select: { teamLeadId: true }
      });

      const targetTLId = lastApproval?.changedById || creator?.teamLeadId;

      if (targetTLId) {
        await db.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: targetTLId,
            title: "IT Operator Claimed Task",
            message: `IT Operator ${user.name || user.email} is taking over and handling the task for account ${account.serialCode}.`,
            type: "IT Takeover",
            isRead: false
          }
        });
      }
    } else if (toStatus === "REJECTED" || toStatus === "ACTIVE" || toStatus === "COMPLETED") {
      // Notify Sales Associate who created the account
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: account.createdById,
          title: `Account workflow update: ${toStatus}`,
          message: `Your account with serial ${account.serialCode} has been processed to status ${toStatus}.`,
          type: toStatus === "REJECTED" ? "Rejection" : "Approval",
          isRead: false
        }
      });
    }

    revalidatePath("/accounts");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update status.");
  }
}

export async function verifyAccountAction(accountId: string, verify: boolean) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"]);

  const account = await db.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  if (user.role !== "SUPER_ADMIN" && account.companyId !== user.companyId) {
    throw new Error("UNAUTHORIZED");
  }

  const newStatus = verify ? "Yes" : "No";

  try {
    await db.account.update({
      where: { id: accountId },
      data: {
        verificationStatus: newStatus,
        updatedById: user.id,
        updatedAt: new Date()
      }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "VERIFY_TOGGLE",
      entity: "account",
      entityId: accountId,
      oldValue: account.verificationStatus,
      newValue: newStatus
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Verification update failed.");
  }
}
