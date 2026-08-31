"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth, getCompanyFilter, logAction } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { sanitizeInput, hashPassword, encryptCredential, decryptCredential } from "@/lib/security";
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
  try {
    const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE"]);

    // Validation
    const result = CreateAccountSchema.safeParse(formData);
    if (!result.success) {
      return { success: false, error: result.error.issues.map(e => e.message).join(", ") };
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
        return { success: false, error: "Target company is required for Super Admin." };
      }
      companyId = targetCompanyId;
    }

    if (!companyId) {
      return { success: false, error: "No company context found." };
    }

    // Check global uniqueness of serial code
    const existingSerial = await db.account.findUnique({
      where: { serialCode },
    });

    if (existingSerial) {
      return { success: false, error: `Serial Code "${serialCode}" is already in use globally. It must be unique.` };
    }

    const accountId = crypto.randomUUID();

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
    console.error("[CREATE_ACCOUNT_ACTION_ERROR]", error);
    return { success: false, error: error.message || "Failed to create account." };
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
  return members.map(m => ({
    ...m,
    employee: m.employee ? {
      ...m.employee,
      laptopPassword: decryptCredential(m.employee.laptopPassword),
      vpnCredentials: decryptCredential(m.employee.vpnCredentials)
    } : null
  }));
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
  try {
    const itUser = await enforceAuth(["IT_DEPARTMENT", "SUPER_ADMIN", "COMPANY_OWNER"]);

    if (!password || password.trim().length < 3) {
      return { success: false, error: "Password must be at least 3 characters." };
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return { success: false, error: "User not found." };
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

    const existingEmployee = await db.employee.findUnique({
      where: { userId }
    });

    if (existingEmployee) {
      await db.employee.update({
        where: { userId },
        data: {
          laptopPassword: encryptCredential(password.trim()) || null,
          updatedAt: new Date()
        }
      });
    } else {
      // Find a valid company ID fallback if targetUser or itUser has no companyId
      let validCompanyId: string | null = targetUser.companyId || itUser.companyId || null;
      if (!validCompanyId) {
        const firstComp = await db.company.findFirst({ select: { id: true } });
        if (firstComp) validCompanyId = firstComp.id;
      }

      await db.employee.create({
        data: {
          id: crypto.randomUUID(),
          employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          fullName: targetUser.name || targetUser.email,
          email: targetUser.email,
          companyId: validCompanyId || "",
          userId: targetUser.id,
          laptopPassword: encryptCredential(password.trim()) || null,
          updatedAt: new Date()
        }
      });
    }

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
    return { success: true, message: "Password assigned and user approved successfully!" };
  } catch (error: any) {
    console.error("[IT_ASSIGN_PASSWORD_ERROR]", error);
    return { success: false, error: error.message || "Failed to assign password." };
  }
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
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      user_account_updatedByIdTouser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  return requests;
}

/**
 * Team Lead Account Editing Action
 */
export async function updateAccountDetailsByTLAction(params: {
  accountId: string;
  platformId?: string;
  serialCode?: string;
  idName?: string;
  adsPublished?: number;
  verificationStatus?: "Yes" | "No";
  comment?: string;
}) {
  try {
    const user = await enforceAuth(["TEAM_LEAD", "SUPER_ADMIN", "COMPANY_OWNER"]);

    const account = await db.account.findUnique({
      where: { id: params.accountId }
    });

    if (!account) {
      return { success: false, error: "Account not found." };
    }

    if (user.role !== "SUPER_ADMIN" && account.companyId !== user.companyId) {
      return { success: false, error: "UNAUTHORIZED: Access to another company's record is forbidden." };
    }

    const updateData: any = {
      updatedById: user.id,
      updatedAt: new Date()
    };

    if (params.platformId) updateData.platformId = sanitizeInput(params.platformId);
    if (params.idName) updateData.idName = sanitizeInput(params.idName);
    if (typeof params.adsPublished === "number" && !isNaN(params.adsPublished)) {
      updateData.adsPublished = Math.max(0, params.adsPublished);
    }
    if (params.verificationStatus) updateData.verificationStatus = params.verificationStatus;
    if (params.comment !== undefined) updateData.comment = sanitizeInput(params.comment);

    if (params.serialCode) {
      const cleanSerial = sanitizeInput(params.serialCode);
      if (cleanSerial !== account.serialCode) {
        const existing = await db.account.findUnique({
          where: { serialCode: cleanSerial }
        });
        if (existing) {
          return { success: false, error: `Serial Code "${cleanSerial}" is already in use by another account.` };
        }
        updateData.serialCode = cleanSerial;
      }
    }

    const updated = await db.account.update({
      where: { id: params.accountId },
      data: updateData,
      include: {
        platform: true,
        user_account_createdByIdTouser: { select: { id: true, name: true, email: true } },
        user_account_updatedByIdTouser: { select: { id: true, name: true, email: true } }
      }
    });

    await db.accounthistory.create({
      data: {
        id: crypto.randomUUID(),
        accountId: params.accountId,
        fromStatus: account.status,
        toStatus: account.status,
        changedById: user.id,
        notes: `Account details edited by Team Lead (${user.name || user.email}).`
      }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "EDIT_ACCOUNT_DETAILS",
      entity: "account",
      entityId: params.accountId,
      oldValue: JSON.stringify(account),
      newValue: JSON.stringify(updated)
    });

    revalidatePath("/associates-requests");
    revalidatePath("/accounts");
    return { success: true, account: updated };
  } catch (err: any) {
    console.error("[UPDATE_ACCOUNT_DETAILS_TL_ERROR]", err);
    return { success: false, error: err.message || "Failed to update account details." };
  }
}

/**
 * Bulk Update Account Status Action (Approve / Reject / Accept / Sort multiple requests)
 */
export async function bulkUpdateAccountStatusAction(
  accountIds: string[],
  toStatus: account_status,
  notes?: string
) {
  try {
    const user = await enforceAuth(["IT_DEPARTMENT", "TEAM_LEAD", "SUPER_ADMIN", "COMPANY_OWNER"]);

    if (!accountIds || accountIds.length === 0) {
      return { success: false, error: "No accounts selected for bulk processing." };
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const accountId of accountIds) {
      try {
        const res = await updateAccountStatusAction(
          accountId, 
          toStatus, 
          notes || `Bulk ${toStatus} processed by ${user.role}`
        );
        if (res?.success !== false) {
          successCount++;
        }
      } catch (err: any) {
        errors.push(`Account ${accountId}: ${err.message}`);
      }
    }

    revalidatePath("/associates-requests");
    revalidatePath("/accounts");
    revalidatePath("/master-accounts-pool");
    return { success: true, count: successCount, total: accountIds.length, errors, message: `Successfully processed ${successCount} accounts.` };
  } catch (err: any) {
    console.error("[BULK_UPDATE_ACCOUNT_STATUS_ERROR]", err);
    return { success: false, error: err.message || "Failed to execute bulk status update." };
  }
}

/**
 * Get active platforms dropdown
 */
export async function getPlatformsAction() {
  await enforceAuth();
  const platforms = await db.platform.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" }
  });
  return platforms;
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

/**
 * Create a new platform dynamically
 */
export async function createPlatformAction(name: string) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]);
  const cleanName = sanitizeInput(name);
  if (!cleanName) throw new Error("Platform name is required.");

  const existing = await db.platform.findFirst({
    where: {
      name: cleanName,
      isArchived: false
    }
  });

  if (existing) {
    return { success: true, platform: existing };
  }

  const newPlatform = await db.platform.create({
    data: {
      id: `plat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      updatedAt: new Date()
    }
  });

  revalidatePath("/accounts");
  return { success: true, platform: newPlatform };
}

/**
 * Soft-delete / archive an account (Allows Team Leads, Company Owners, Super Admins)
 */
export async function deleteAccountAction(accountId: string) {
  try {
    const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"]);

    if (!accountId) {
      return { success: false, error: "Account ID is required." };
    }

    const account = await db.account.findUnique({
      where: { id: accountId },
      include: {
        company: { select: { name: true } }
      }
    });

    if (!account) {
      return { success: false, error: "Account not found or already deleted." };
    }

    // Role-based authorization check
    if (user.role !== "SUPER_ADMIN") {
      if (account.companyId !== user.companyId) {
        return { success: false, error: "Unauthorized: You can only delete accounts within your company." };
      }
    }

    // Soft delete / archive
    await db.account.update({
      where: { id: accountId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: user.id,
      }
    });

    // Record in audit log
    await logAction({
      userId: user.id,
      userEmail: user.email || "Unknown",
      userRole: user.role,
      action: "DELETE_ACCOUNT",
      entity: "account",
      entityId: account.id,
      oldValue: JSON.stringify({ serialCode: account.serialCode, idName: account.idName }),
      newValue: "ARCHIVED"
    });

    revalidatePath("/accounts");
    revalidatePath("/master-accounts-pool");

    return { success: true, message: `Account ${account.serialCode} (${account.idName}) successfully deleted.` };
  } catch (error: any) {
    console.error("deleteAccountAction error:", error);
    return { success: false, error: error.message || "Failed to delete account." };
  }
}


