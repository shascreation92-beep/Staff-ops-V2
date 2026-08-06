"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth, getCompanyFilter, logAction } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { sanitizeInput, hashPassword } from "@/lib/security";
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

  const platformId = sanitizeInput(result.data.platformId);
  const serialCode = sanitizeInput(result.data.serialCode);
  const idName = sanitizeInput(result.data.idName);
  const comment = result.data.comment ? sanitizeInput(result.data.comment) : undefined;
  const { adsPublished, verificationStatus, targetCompanyId, submissionDate } = result.data;

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

    const createdAccount = await db.account.findUnique({
      where: { id: accountId },
      include: {
        platform: true,
        company: {
          select: { name: true }
        },
        user_account_createdByIdTouser: {
          select: { name: true, email: true, role: true }
        },
        user_account_updatedByIdTouser: {
          select: { name: true, email: true }
        }
      }
    });

    revalidatePath("/accounts");
    return { success: true, accountId, account: createdAccount };
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
        throw new Error("UNAUTHORIZED: Sales Representatives can only submit Draft or Rejected accounts for TL approval.");
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
        throw new Error("UNAUTHORIZED: Sales Representatives can only submit Draft or Rejected accounts.");
      }
      if (toStatus !== "SUBMITTED" && toStatus !== "DRAFT") {
        throw new Error("Invalid transition: Sales Representatives can only transition to Draft or Submitted.");
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
            message: `Account serial ${account.serialCode} has been submitted by Sales Representative ${associateName} and is pending your approval.`,
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
              message: `Account serial ${account.serialCode} has been submitted by Sales Representative ${associateName} and is pending your approval.`,
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
    const isPersonalAccount = account.createdById === user.id;
    if (!isPersonalAccount) {
      const creatorUser = await db.user.findUnique({
        where: { id: account.createdById },
        select: { teamLeadId: true }
      });
      if (creatorUser?.teamLeadId !== user.id) {
        throw new Error("UNAUTHORIZED: You can only verify accounts belonging to your own associates.");
      }
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
    const isPersonalAccount = account.createdById === user.id;
    if (!isPersonalAccount) {
      const creatorUser = await db.user.findUnique({
        where: { id: account.createdById },
        select: { teamLeadId: true }
      });
      if (creatorUser?.teamLeadId !== user.id) {
        throw new Error("UNAUTHORIZED: You can only edit ads count for accounts belonging to your own associates.");
      }
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
      role: true,
      image: true,
      lastActiveAt: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          laptopBrand: true,
          laptopModel: true,
          laptopSerialNumber: true,
          windowsVersion: true,
          vpnProvider: true,
          laptopPassword: true,
          vpnCredentials: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });
  return members;
}

export async function addSalesAssociateAction({
  name,
  email,
  password
}: {
  name: string;
  email: string;
  password?: string;
}) {
  const user = await enforceAuth(["TEAM_LEAD", "SUPER_ADMIN"]);

  if (!email || !email.includes("@")) {
    throw new Error("Invalid email address.");
  }

  const cleanName = sanitizeInput(name || email.split("@")[0]);
  const cleanEmail = sanitizeInput(email).toLowerCase().trim();

  // Check if user exists
  const existingUser = await db.user.findUnique({
    where: { email: cleanEmail }
  });

  if (existingUser) {
    if (existingUser.role !== "SALES_ASSOCIATE") {
      throw new Error(`User with email "${cleanEmail}" already exists as a ${existingUser.role}.`);
    }

    // Map existing Sales Associate to this Team Lead and request IT approval if pending
    await db.user.update({
      where: { id: existingUser.id },
      data: {
        teamLeadId: user.id,
        companyId: user.companyId || existingUser.companyId,
        status: "PENDING",
        isArchived: false,
        updatedAt: new Date()
      }
    });

    revalidatePath("/my-team");
    return { success: true, mode: "PENDING_IT" };
  }

  // Create new Sales Associate user with PENDING status awaiting IT password assignment
  const newAssociate = await db.user.create({
    data: {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      role: "SALES_ASSOCIATE",
      status: "PENDING",
      companyId: user.companyId || null,
      teamLeadId: user.id,
      updatedAt: new Date()
    }
  });

  // Send approval notification to IT Department & Super Admin
  const itUsers = await db.user.findMany({
    where: {
      role: { in: ["IT_DEPARTMENT", "SUPER_ADMIN"] },
      isArchived: false
    },
    select: { id: true }
  });

  for (const it of itUsers) {
    await db.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: it.id,
        title: "Sales Representative Approval Required",
        message: `Team Lead ${user.name || "TL"} added Sales Representative ${cleanName} (${cleanEmail}). IT approval & password assignment required.`,
        type: "ITApprovalRequest",
        isRead: false
      }
    });
  }

  revalidatePath("/my-team");
  revalidatePath("/user-directory");
  return { success: true, mode: "PENDING_IT", userId: newAssociate.id };
}

export async function approveAndAssignPasswordITAction({
  userId,
  password
}: {
  userId: string;
  password: string;
}) {
  const itUser = await enforceAuth(["IT_DEPARTMENT", "SUPER_ADMIN"]);

  if (!password || password.trim().length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const targetUser = await db.user.findUnique({
    where: { id: userId }
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  const hashedPassword = await hashPassword(password.trim());

  await db.user.update({
    where: { id: userId },
    data: {
      status: "APPROVED",
      password: hashedPassword,
      updatedAt: new Date()
    }
  });

  if (targetUser.teamLeadId) {
    await db.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: targetUser.teamLeadId,
        title: "Sales Representative Account Approved by IT",
        message: `IT Department approved account for ${targetUser.name || targetUser.email} and assigned login password.`,
        type: "ITApprovedNotice",
        isRead: false
      }
    });
  }

  await logAction({
    userId: itUser.id,
    userEmail: itUser.email || "",
    userRole: itUser.role,
    action: "IT_APPROVE_USER_SET_PASSWORD",
    entity: "user",
    entityId: userId,
    newValue: `Approved user and assigned password`
  });

  revalidatePath("/my-team");
  revalidatePath("/user-directory");
  revalidatePath("/it-management");
  return { success: true };
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
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD", "IT_DEPARTMENT", "SUPER_ADMIN"]);

  const account = await db.account.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  const isITOrAdmin = ["IT_DEPARTMENT", "SUPER_ADMIN"].includes(user.role);
  if (!isITOrAdmin && account.createdById !== user.id) {
    throw new Error("UNAUTHORIZED: You can only update issue options for your own accounts.");
  }

  try {
    const dataUpdate: any = {
      issueType,
      updatedById: user.id,
      updatedAt: new Date()
    };

    if (account.status !== "SORTED") {
      dataUpdate.status = "SORTED";
      dataUpdate.verificationStatus = "Yes";
    }

    await db.account.update({
      where: { id: accountId },
      data: dataUpdate
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

  const isPersonalAccount = account.createdById === user.id;
  if (user.role !== "SALES_ASSOCIATE" && !(user.role === "TEAM_LEAD" && isPersonalAccount)) {
    throw new Error("UNAUTHORIZED: Only Sales Associates and Team Leads on their personal accounts can edit comments.");
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

export async function updateAccountITNotesAction(accountId: string, itNotes: string) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "IT_DEPARTMENT"]);

  const account = await db.account.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  // Multi-tenant check
  if (user.role !== "SUPER_ADMIN" && account.companyId !== user.companyId) {
    throw new Error("UNAUTHORIZED: Access to another company's record is forbidden.");
  }

  try {
    const updatedAccount = await db.account.update({
      where: { id: accountId },
      data: {
        itNotes: itNotes.trim() || null,
        updatedById: user.id,
        updatedAt: new Date()
      }
    });

    // Write audit log
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "UPDATE_IT_NOTES",
      entity: "account",
      entityId: accountId,
      oldValue: account.itNotes || "",
      newValue: itNotes
    });

    try {
      revalidatePath("/accounts");
      revalidatePath("/master-accounts-pool");
      revalidatePath("/team-live-roster");
    } catch (revalErr: any) {
      console.warn("Non-fatal revalidation warning:", revalErr.message || revalErr);
    }

    return { success: true, account: updatedAccount };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update IT comments.");
  }
}

export async function updateAccount2FACodeAction(accountId: string, twoFactorCode: string) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "IT_DEPARTMENT"]);

  // Fetch the account to check exists
  const account = await db.account.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  // Multi-tenant check
  if (user.role !== "SUPER_ADMIN" && account.companyId !== user.companyId) {
    throw new Error("UNAUTHORIZED: Access denied.");
  }

  try {
    const updatedAccount = await db.account.update({
      where: { id: accountId },
      data: {
        comment: twoFactorCode,
        updatedById: user.id,
        updatedAt: new Date()
      }
    });

    // Log the change
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "UPDATE_2FA",
      entity: "account",
      entityId: accountId,
      oldValue: account.comment || "",
      newValue: twoFactorCode
    });

    try {
      revalidatePath("/accounts");
      revalidatePath("/master-accounts-pool");
    } catch (revalErr: any) {
      console.warn("Non-fatal revalidation warning:", revalErr.message || revalErr);
    }

    return { success: true, account: updatedAccount };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update 2FA code.");
  }
}

/**
 * Account Health & Fatigue Score Calculator (0-100%)
 */
export async function calculateAccountHealthScore(account: {
  status: string;
  verificationStatus: string;
  adsPublished: number;
  issueType?: string | null;
}) {
  let score = 80;

  if (account.status === "ACTIVE") score += 15;
  if (account.status === "REJECTED") score -= 35;
  if (account.verificationStatus === "Yes") score += 10;
  if (account.verificationStatus === "No") score -= 15;
  if (account.adsPublished === 0) score -= 10;
  if (account.issueType && account.issueType !== "Active") score -= 20;

  const finalScore = Math.max(0, Math.min(100, score));

  let grade: "EXCELLENT" | "STABLE" | "WARNING" | "CRITICAL" = "STABLE";
  if (finalScore >= 85) grade = "EXCELLENT";
  else if (finalScore >= 60) grade = "STABLE";
  else if (finalScore >= 40) grade = "WARNING";
  else grade = "CRITICAL";

  return { score: finalScore, grade };
}

/**
 * Fetch timeline audit history for a specific account
 */
export async function getAccountHistoryAction(accountId: string) {
  const user = await enforceAuth();

  const history = await db.accounthistory.findMany({
    where: { accountId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return { success: true, history };
}

