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
  targetCompanyId: z.string().optional(), // For Super Admin
  submissionDate: z.string().optional(), // New field
  comment: z.string().optional()
});

export async function createAccountAction(formData: z.infer<typeof CreateAccountSchema>) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE"]);

  // Validation
  const result = CreateAccountSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { platformId, serialCode, idName, adsPublished, verificationStatus, targetCompanyId, submissionDate, comment } = result.data;

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
        comment,
        issueType: "Active",
        companyId,
        createdById: user.id,
        updatedById: user.id,
        createdAt: submissionDate ? new Date(submissionDate) : new Date(),
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
  notes?: string,
  associateId?: string
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

  let finalAssociateId = associateId;

  // Workflow State Validation based on roles
  if (user.role === "SALES_ASSOCIATE") {
    if (toStatus === "PENDING_TL") {
      if (fromStatus !== "DRAFT" && fromStatus !== "REJECTED") {
        throw new Error("UNAUTHORIZED: Sales Associates can only submit Draft or Rejected accounts for TL approval.");
      }
      // Automate fetch of Associate's Name and mapped TL_ID
      const associateUser = await db.user.findUnique({
        where: { id: user.id },
        select: { name: true, teamLeadId: true }
      });
      if (!associateUser?.teamLeadId) {
        throw new Error("You are not mapped to any Team Lead. Please contact administration.");
      }
      finalAssociateId = associateUser.name || user.name || "N/A";
    } else {
      if (fromStatus !== "DRAFT" && fromStatus !== "REJECTED") {
        throw new Error("UNAUTHORIZED: Sales Associates can only submit Draft or Rejected accounts.");
      }
      if (toStatus !== "SUBMITTED" && toStatus !== "DRAFT") {
        throw new Error("Invalid transition: Sales Associates can only transition to Draft or Submitted.");
      }
    }
  }

  if (user.role === "TEAM_LEAD") {
    const isPersonalAccount = account.createdById === user.id;

    if (isPersonalAccount) {
      const validFrom = ["DRAFT", "REJECTED"];
      if (!validFrom.includes(fromStatus)) {
        throw new Error("Invalid transition: Team Leads can only submit Draft or Rejected personal accounts.");
      }
      const validTo = ["FORWARDED_TO_IT"];
      if (!validTo.includes(toStatus)) {
        throw new Error("Invalid transition: Team Leads can only submit personal accounts directly to IT.");
      }
    } else {
      const validFrom = ["PENDING_TL", "SUBMITTED", "UNDER_REVIEW"];
      if (!validFrom.includes(fromStatus)) {
        throw new Error("Invalid transition: Team Leads can only review pending, submitted, or under-review accounts.");
      }
      const validTo = ["APPROVED_BY_TEAM_LEAD", "FORWARDED_TO_IT", "REJECTED", "UNDER_REVIEW"];
      if (!validTo.includes(toStatus)) {
        throw new Error("Invalid transition: Team Leads can only Approve, Forward to IT, Reject, or hold Under Review.");
      }

      // STRICT CROSS-TL PRIVACY CHECK
      const creatorUser = await db.user.findUnique({
        where: { id: account.createdById },
        select: { teamLeadId: true }
      });
      if (creatorUser?.teamLeadId !== user.id) {
        throw new Error("UNAUTHORIZED: You can only view, approve, or access requests belonging to your own associates.");
      }
    }
  }

  if (user.role === "IT_DEPARTMENT") {
    const validFrom = ["FORWARDED_TO_IT", "APPROVED_BY_TEAM_LEAD", "ASSIGNED_TO_IT", "IN_PROGRESS", "IT_PENDING"];
    if (!validFrom.includes(fromStatus)) {
      throw new Error("Invalid transition: IT department can only process approved or in-progress tickets.");
    }
    const validTo = ["IT_PENDING", "SORTED", "ASSIGNED_TO_IT", "IN_PROGRESS", "COMPLETED", "ACTIVE"];
    if (!validTo.includes(toStatus)) {
      throw new Error("Invalid transition: IT department invalid target status.");
    }
  }

  try {
    const dataUpdate: any = {
      status: toStatus,
      updatedById: user.id,
      updatedAt: new Date()
    };
    if (toStatus === "SORTED") {
      dataUpdate.verificationStatus = "Yes";
      dataUpdate.issueType = "Active";
    }
    if (finalAssociateId) {
      dataUpdate.associateId = finalAssociateId.trim();
    }
    if (toStatus === "PENDING_TL") {
      const associateUser = await db.user.findUnique({
        where: { id: user.id },
        select: { teamLeadId: true }
      });
      if (associateUser?.teamLeadId) {
        dataUpdate.teamLeadId = associateUser.teamLeadId;
      }
    }

    const updatedAccount = await db.account.update({
      where: { id: accountId },
      data: dataUpdate
    });

    // Create workflow history
    await db.accounthistory.create({
      data: {
        id: crypto.randomUUID(),
        accountId,
        fromStatus,
        toStatus,
        changedById: user.id,
        notes: notes || `Status updated from ${fromStatus} to ${toStatus}${finalAssociateId ? ` (Associate Name: ${finalAssociateId})` : ""}.`
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
    if (toStatus === "PENDING_TL") {
      const associateUser = await db.user.findUnique({
        where: { id: user.id },
        select: { name: true, teamLeadId: true }
      });
      const associateName = associateUser?.name || user.name || "N/A";
      const targetTlId = associateUser?.teamLeadId;

      if (targetTlId) {
        await db.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: targetTlId,
            title: "New Ad Request Pending Approval",
            message: `Account serial ${account.serialCode} has been submitted by Sales Associate ${associateName} and is pending your approval.`,
            type: "TL Approval Pending",
            isRead: false
          }
        });
      } else {
        const tlUsers = await db.user.findMany({
          where: {
            companyId: account.companyId,
            role: "TEAM_LEAD",
            status: "APPROVED"
          }
        });

        for (const tlUser of tlUsers) {
          await db.notification.create({
            data: {
              id: crypto.randomUUID(),
              userId: tlUser.id,
              title: "New Ad Request Pending Approval",
              message: `Account serial ${account.serialCode} has been submitted by Sales Associate ${associateName} and is pending your approval.`,
              type: "TL Approval Pending",
              isRead: false
            }
          });
        }
      }
    } else if (toStatus === "FORWARDED_TO_IT" || toStatus === "APPROVED_BY_TEAM_LEAD") {
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
            title: "New Account Routing to IT",
            message: `Account serial ${account.serialCode} has been approved and forwarded to the IT queue.`,
            type: "Task Assignment",
            isRead: false
          }
        });
      }
    } else if (toStatus === "ASSIGNED_TO_IT") {
      const lastApproval = await db.accounthistory.findFirst({
        where: {
          accountId: accountId,
          toStatus: { in: ["APPROVED_BY_TEAM_LEAD", "FORWARDED_TO_IT"] }
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
    } else if (toStatus === "IT_PENDING") {
      // Notify Sales Associate that it's in progress
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: account.createdById,
          title: "IT Processing Ticket",
          message: `Your account with serial ${account.serialCode} has been acknowledged and is now Pending in the IT queue.`,
          type: "IT Processing",
          isRead: false
        }
      });
    } else if (toStatus === "SORTED" || toStatus === "REJECTED" || toStatus === "ACTIVE" || toStatus === "COMPLETED") {
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

  // STRICT CROSS-TL PRIVACY CHECK
  if (user.role === "TEAM_LEAD") {
    const creatorUser = await db.user.findUnique({
      where: { id: account.createdById },
      select: { teamLeadId: true }
    });
    if (creatorUser?.teamLeadId !== user.id) {
      throw new Error("UNAUTHORIZED: You can only verify accounts belonging to your own associates.");
    }
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

export async function updateAccountAdsAction(accountId: string, adsCount: number) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE"]);

  const account = await db.account.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  if (user.role !== "SUPER_ADMIN" && account.companyId !== user.companyId) {
    throw new Error("UNAUTHORIZED: Access to another company's account is forbidden.");
  }

  // STRICT CROSS-TL PRIVACY CHECK
  if (user.role === "TEAM_LEAD") {
    const creatorUser = await db.user.findUnique({
      where: { id: account.createdById },
      select: { teamLeadId: true }
    });
    if (creatorUser?.teamLeadId !== user.id) {
      throw new Error("UNAUTHORIZED: You can only edit ads count for accounts belonging to your own associates.");
    }
  }

  try {
    const updatedAccount = await db.account.update({
      where: { id: accountId },
      data: {
        adsPublished: adsCount,
        updatedById: user.id,
        updatedAt: new Date()
      }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "UPDATE_ADS",
      entity: "account",
      entityId: accountId,
      oldValue: String(account.adsPublished),
      newValue: String(adsCount)
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update ads count.");
  }
}

export async function getPendingTLRequestsCountAction() {
  const user = await enforceAuth();
  if (user.role !== "TEAM_LEAD") {
    return 0;
  }
  const count = await db.account.count({
    where: {
      status: "PENDING_TL",
      isArchived: false,
      teamLeadId: user.id
    }
  });
  return count;
}

export async function getTLTeamMembersAction() {
  const user = await enforceAuth(["TEAM_LEAD"]);
  const members = await db.user.findMany({
    where: {
      teamLeadId: user.id,
      role: "SALES_ASSOCIATE",
      isArchived: false
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      lastActiveAt: true
    },
    orderBy: {
      name: "asc"
    }
  });
  return members;
}

export async function getPendingTLRequestsAction() {
  const user = await enforceAuth(["TEAM_LEAD"]);
  const requests = await db.account.findMany({
    where: {
      status: "PENDING_TL",
      isArchived: false,
      teamLeadId: user.id
    },
    include: {
      platform: true,
      user_account_createdByIdTouser: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  return requests;
}

export async function updateAccountIssueAction(accountId: string, issueType: string) {
  const user = await enforceAuth(["SALES_ASSOCIATE"]);

  const account = await db.account.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  if (account.createdById !== user.id) {
    throw new Error("UNAUTHORIZED: You can only update issue options for your own accounts.");
  }

  try {
    await db.account.update({
      where: { id: accountId },
      data: {
        issueType,
        updatedById: user.id,
        updatedAt: new Date()
      }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "UPDATE_ISSUE_TYPE",
      entity: "account",
      entityId: accountId,
      oldValue: account.issueType || "Active",
      newValue: issueType
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update issue status.");
  }
}

export async function updateAccountCommentAction(accountId: string, comment: string) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]);

  const account = await db.account.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  if (user.role === "SALES_ASSOCIATE" && account.createdById !== user.id) {
    throw new Error("UNAUTHORIZED: You can only update comments on your own accounts.");
  }

  if (user.role !== "SALES_ASSOCIATE") {
    throw new Error("UNAUTHORIZED: Only Sales Associates can edit comments.");
  }

  try {
    await db.account.update({
      where: { id: accountId },
      data: {
        comment: comment.trim() || null,
        updatedById: user.id,
        updatedAt: new Date()
      }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "UPDATE_COMMENT",
      entity: "account",
      entityId: accountId,
      oldValue: account.comment || "",
      newValue: comment
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update comment.");
  }
}
