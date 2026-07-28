"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth, logAction, getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { hashPassword, sanitizeInput } from "@/lib/security";
import { user_role, user_status } from "@prisma/client";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["TEAM_LEAD", "IT_DEPARTMENT"]),
});

export async function sendInvitationAction(formData: z.infer<typeof InviteSchema>) {
  const inviter = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  const result = InviteSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { email, role } = result.data;
  const companyId = inviter.companyId;

  if (!companyId && inviter.role !== "SUPER_ADMIN") {
    throw new Error("No company context found for inviter.");
  }

  // Resolve target company ID
  const targetCompanyId = companyId || ""; 

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email }
  });

  try {
    if (existingUser) {
      if (existingUser.role === role) {
        throw new Error(`User with email "${email}" already holds the "${role}" role.`);
      }

      if (existingUser.role !== "SALES_ASSOCIATE") {
        throw new Error(`Only Sales Representatives can be upgraded to Team Lead. User is currently "${existingUser.role}".`);
      }

      if (role !== "TEAM_LEAD") {
        throw new Error("Only Team Lead invitations can be sent to existing Sales Representatives.");
      }

      // Create upgrade notification
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: existingUser.id,
          title: "Invitation to upgrade to Team Lead",
          message: `The Company has invited you to upgrade your role to Team Lead. Accept the upgrade request to promote your account.`,
          type: "UpgradeInvitation",
          isRead: false
        }
      });

      await logAction({
        userId: inviter.id,
        userEmail: inviter.email || "",
        userRole: inviter.role,
        action: "INVITE_UPGRADE",
        entity: "user",
        entityId: existingUser.id,
        newValue: `Invited to upgrade to ${role}`
      });

      return { success: true, mode: "UPGRADE" };
    } else {
      // Create new pending user
      const newUserId = crypto.randomUUID();
      const tempUser = await db.user.create({
        data: {
          id: newUserId,
          email,
          name: email.split("@")[0],
          role,
          status: "PENDING",
          companyId: targetCompanyId || null,
          updatedAt: new Date()
        }
      });

      // Create join invitation notification targeting the new user
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: newUserId,
          title: `Invitation to join as ${role === "IT_DEPARTMENT" ? "IT member" : "Team Lead"}`,
          message: `You have been invited to join the Company as a ${role.replace("_", " ")}. Accept to activate your account.`,
          type: "JoinInvitation",
          isRead: false
        }
      });

      await logAction({
        userId: inviter.id,
        userEmail: inviter.email || "",
        userRole: inviter.role,
        action: "INVITE_NEW",
        entity: "user",
        entityId: newUserId,
        newValue: `Invited new ${role} user: ${email}`
      });

      return { success: true, mode: "NEW_JOIN" };
    }
  } catch (error: any) {
    throw new Error(error.message || "Failed to issue invitation.");
  }
}

export async function acceptUpgradeAction(notificationId: string) {
  const user = await enforceAuth();

  const notification = await db.notification.findUnique({
    where: { id: notificationId }
  });

  if (!notification || notification.userId !== user.id) {
    throw new Error("Invitation notification not found or unauthorized.");
  }

  try {
    // Perform upgrade
    await db.user.update({
      where: { id: user.id },
      data: {
        role: "TEAM_LEAD",
        updatedAt: new Date()
      }
    });

    // Delete/Archive notification
    await db.notification.delete({
      where: { id: notificationId }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "ACCEPT_UPGRADE",
      entity: "user",
      entityId: user.id,
      newValue: "Role upgraded to TEAM_LEAD"
    });

    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to process role upgrade.");
  }
}

export async function acceptJoinAction(userId: string) {
  // Can be called by the user themselves in the pending state
  const pendingUser = await db.user.findUnique({
    where: { id: userId }
  });

  if (!pendingUser || pendingUser.status !== "PENDING") {
    throw new Error("No pending user found to accept invitation.");
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        status: "APPROVED",
        updatedAt: new Date()
      }
    });

    // Clean up notifications
    await db.notification.updateMany({
      where: { userId, type: "JoinInvitation" },
      data: { isRead: true, isArchived: true }
    });

    await logAction({
      userId,
      userEmail: pendingUser.email || "",
      userRole: pendingUser.role,
      action: "ACCEPT_JOIN",
      entity: "user",
      entityId: userId,
      newValue: "Status activated to APPROVED"
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to activate invitation.");
  }
}

export async function declineInvitationAction(notificationId: string, isNewJoin: boolean, pendingUserId?: string) {
  if (isNewJoin) {
    const targetId = pendingUserId;
    if (!targetId) throw new Error("User ID is required to decline new join.");

    try {
      // Decline: delete the temporary pending user
      await db.user.delete({
        where: { id: targetId }
      });
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message || "Failed to decline invitation.");
    }
  } else {
    // It's an upgrade notification
    const user = await enforceAuth();
    try {
      await db.notification.delete({
        where: { id: notificationId }
      });
      revalidatePath("/");
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message || "Failed to dismiss upgrade invitation.");
    }
  }
}

export async function getPendingUserStatusAction() {
  const session = await getServerAuthSession();
  if (!session?.user) {
    return { authenticated: false };
  }
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id }
  });
  if (!dbUser) {
    return { authenticated: false };
  }
  // Check for active JoinInvitation
  const invite = await db.notification.findFirst({
    where: {
      userId: dbUser.id,
      type: "JoinInvitation",
      isArchived: false,
    }
  });
  return {
    authenticated: true,
    status: dbUser.status,
    role: dbUser.role,
    email: dbUser.email,
    id: dbUser.id,
    invitation: invite ? { id: invite.id, title: invite.title, message: invite.message } : null
  };
}

export async function getUpgradeInvitationAction() {
  const session = await getServerAuthSession();
  if (!session?.user || session.user.role !== "SALES_ASSOCIATE") {
    return { invitation: null };
  }
  const invite = await db.notification.findFirst({
    where: {
      userId: session.user.id,
      type: "UpgradeInvitation",
      isArchived: false,
    }
  });
  return {
    invitation: invite ? { id: invite.id, title: invite.title, message: invite.message } : null
  };
}

const OnboardSalesAssociateSchema = z.object({
  fullName: z.string().min(1, "Full Name is required"),
  email: z.string().email("Invalid email format"),
  employeeId: z.string().optional(),
  password: z.string().optional(),
  teamLeadId: z.string().optional(),
});

export async function onboardSalesAssociateAction(formData: z.infer<typeof OnboardSalesAssociateSchema>) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"]);

  const result = OnboardSalesAssociateSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { fullName, email, employeeId, password, teamLeadId } = result.data;

  // Determine Company ID
  let companyId = currentUser.companyId;
  if (currentUser.role === "SUPER_ADMIN") {
    const company = await db.company.findFirst({
      where: { isArchived: false, status: "APPROVED" }
    });
    companyId = company?.id || "";
  }

  if (!companyId) {
    throw new Error("No company context found to assign Sales Representative.");
  }

  // Check unique email in user table
  const existingUser = await db.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  const isTL = currentUser.role === "TEAM_LEAD";
  const targetTeamLeadId = isTL ? currentUser.id : (teamLeadId || null);

  try {
    const newUserId = crypto.randomUUID();

    // Create User (Pending) - STRICTLY set to 'PENDING'
    const newUser = await db.user.create({
      data: {
        id: newUserId,
        email,
        name: fullName,
        role: "SALES_ASSOCIATE",
        status: "PENDING", // STRICTLY FORCE PENDING STATUS
        companyId,
        teamLeadId: targetTeamLeadId,
        password: (password && password.trim()) ? password.trim() : null,
        updatedAt: new Date(),
      }
    });

    // Notify IT department (IT_READ_ONLY notification)
    const itMembers = await db.user.findMany({
      where: {
        companyId,
        role: "IT_DEPARTMENT",
        isArchived: false,
        status: "APPROVED"
      }
    });

    for (const itUser of itMembers) {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: itUser.id,
          title: "New Onboarding Request Submitted",
          message: `New Onboarding Request Submitted: Sales Representative ${fullName} (${email}) has been submitted for onboarding by ${currentUser.name || currentUser.email}.`,
          type: "IT_READ_ONLY",
          isRead: false
        }
      });
    }

    // Write audit log
    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userRole: currentUser.role,
      action: "SUBMIT_ONBOARDING_REQUEST",
      entity: "user",
      entityId: newUserId,
      newValue: JSON.stringify({ user: newUser })
    });

    revalidatePath("/employees");
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to submit onboarding request.");
  }
}

const OnboardTeamLeadSchema = z.object({
  fullName: z.string().min(1, "Full Name is required"),
  email: z.string().email("Invalid email format"),
  employeeId: z.string().min(1, "Employee ID is required"),
  password: z.string().min(1, "Password is required"),
  companyId: z.string().optional(),
  role: z.enum(["TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]).optional(),
});

export async function onboardTeamLeadAction(formData: z.infer<typeof OnboardTeamLeadSchema>) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  const result = OnboardTeamLeadSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { fullName, email, employeeId, password, companyId, role } = result.data;
  const targetRole = role || "TEAM_LEAD";

  // Determine Company ID
  let targetCompanyId = currentUser.companyId;
  if (currentUser.role === "SUPER_ADMIN" || (currentUser.role === "COMPANY_OWNER" && companyId)) {
    targetCompanyId = companyId || currentUser.companyId;
  }

  if (!targetCompanyId) {
    throw new Error(`No company context found to assign ${targetRole.replace("_", " ")}.`);
  }

  const companyIdValue = targetCompanyId; // Assign to a stable variable for database queries

  // Check unique email in user table
  const existingUser = await db.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  // Check unique email and employeeId in employee table
  const existingEmail = await db.employee.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw new Error("An employee with this email already exists.");
  }

  const existingId = await db.employee.findUnique({
    where: { employeeId },
  });
  if (existingId) {
    throw new Error(`Employee ID "${employeeId}" is already in use.`);
  }

  try {
    const newUserId = crypto.randomUUID();
    const newEmployeeId = crypto.randomUUID();

    const hashedPassword = password ? await hashPassword(password) : null;

    // Create User (Approved/Active)
    const newUser = await db.user.create({
      data: {
        id: newUserId,
        email: sanitizeInput(email),
        name: sanitizeInput(fullName),
        role: targetRole,
        status: "APPROVED", // Directly active
        password: hashedPassword,
        companyId: companyIdValue,
        teamLeadId: null,
        updatedAt: new Date(),
      }
    });

    // Create Employee
    const newEmp = await db.employee.create({
      data: {
        id: newEmployeeId,
        employeeId,
        fullName,
        email,
        status: "ACTIVE",
        companyId: companyIdValue,
        userId: newUserId,
        updatedAt: new Date(),
      }
    });

    // Notify IT department (IT_READ_ONLY notification)
    const itMembers = await db.user.findMany({
      where: {
        companyId: companyIdValue,
        role: "IT_DEPARTMENT",
        isArchived: false,
        status: "APPROVED"
      }
    });

    for (const itUser of itMembers) {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: itUser.id,
          title: "New Team Lead Onboarded",
          message: `Team Lead ${fullName} (${email}) has been successfully onboarded by ${currentUser.name || currentUser.email}.`,
          type: "IT_READ_ONLY",
          isRead: false
        }
      });
    }

    // Write audit log
    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userRole: currentUser.role,
      action: "ONBOARD_TEAM_LEAD",
      entity: "user",
      entityId: newUserId,
      newValue: JSON.stringify({ user: newUser, employee: newEmp })
    });

    revalidatePath("/employees");
    revalidatePath("/settings");
    revalidatePath("/team-leads");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to onboard Team Lead.");
  }
}

const ApproveSalesAssociateSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  employeeId: z.string().optional(),
  password: z.string().min(1, "Password is required"),
});

export async function approveSalesAssociateAction(formData: z.infer<typeof ApproveSalesAssociateSchema>) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  const result = ApproveSalesAssociateSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { userId, employeeId, password } = result.data;

  // Fetch the pending user
  const pendingUser = await db.user.findUnique({
    where: { id: userId }
  });

  if (!pendingUser) {
    throw new Error("User not found.");
  }

  if (pendingUser.status !== "PENDING" || pendingUser.role !== "SALES_ASSOCIATE") {
    throw new Error("Target user is not a pending Sales Representative.");
  }

  // Multi-tenant check
  if (currentUser.role !== "SUPER_ADMIN" && pendingUser.companyId !== currentUser.companyId) {
    throw new Error("UNAUTHORIZED: Access to another company's records is forbidden.");
  }

  // Check unique email in employee table
  const existingEmail = await db.employee.findUnique({
    where: { email: pendingUser.email },
  });
  if (existingEmail) {
    throw new Error("An employee with this email already exists.");
  }

  // Auto-generate or validate Employee ID
  let targetEmployeeId: string;
  if (!employeeId || !employeeId.trim()) {
    let isUnique = false;
    let generatedId = "";
    while (!isUnique) {
      generatedId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
      const existing = await db.employee.findUnique({
        where: { employeeId: generatedId }
      });
      if (!existing) {
        isUnique = true;
      }
    }
    targetEmployeeId = generatedId;
  } else {
    targetEmployeeId = employeeId;
    const existingId = await db.employee.findUnique({
      where: { employeeId: targetEmployeeId },
    });
    if (existingId) {
      throw new Error(`Employee ID "${targetEmployeeId}" is already in use.`);
    }
  }

  try {
    const newEmployeeId = crypto.randomUUID();

    const hashedPassword = await hashPassword(password);

    // 1. Update User to APPROVED and set Password
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        status: "APPROVED",
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    // 2. Create Employee record
    const newEmp = await db.employee.create({
      data: {
        id: newEmployeeId,
        employeeId: targetEmployeeId,
        fullName: pendingUser.name || "Sales Representative",
        email: pendingUser.email,
        status: "ACTIVE",
        companyId: pendingUser.companyId || currentUser.companyId || "",
        userId: userId,
        updatedAt: new Date()
      }
    });

    // 3. Notify IT department (IT_READ_ONLY notification)
    const itMembers = await db.user.findMany({
      where: {
        companyId: pendingUser.companyId,
        role: "IT_DEPARTMENT",
        isArchived: false,
        status: "APPROVED"
      }
    });

    for (const itUser of itMembers) {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: itUser.id,
          title: "New Sales Representative Onboarded",
          message: `${pendingUser.name} (${pendingUser.email}) has been successfully approved and onboarded by ${currentUser.name || currentUser.email}.`,
          type: "IT_READ_ONLY",
          isRead: false
        }
      });
    }

    // 4. Log Action
    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userRole: currentUser.role,
      action: "APPROVE_ONBOARDING_REQUEST",
      entity: "user",
      entityId: userId,
      newValue: JSON.stringify({ user: updatedUser, employee: newEmp })
    });

    revalidatePath("/settings");
    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to approve onboarding request.");
  }
}

export async function updateUserPasswordAction(newPassword: string) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);
  if (!newPassword || !newPassword.trim()) {
    throw new Error("Password cannot be empty.");
  }

  try {
    await db.user.update({
      where: { id: currentUser.id },
      data: {
        password: newPassword,
        updatedAt: new Date(),
      }
    });

    // Also write audit log
    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userRole: currentUser.role,
      action: "UPDATE_PASSWORD",
      entity: "user",
      entityId: currentUser.id,
      newValue: "Password updated successfully"
    });

    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update password.");
  }
}

const AdminResetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: z.string().min(1, "Password cannot be empty"),
});

export async function adminResetUserPasswordAction(formData: z.infer<typeof AdminResetPasswordSchema>) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  const result = AdminResetPasswordSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { userId, newPassword } = result.data;

  const targetUser = await db.user.findUnique({
    where: { id: userId }
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  // Multi-tenant check
  if (currentUser.role !== "SUPER_ADMIN" && targetUser.companyId !== currentUser.companyId) {
    throw new Error("UNAUTHORIZED: Access to another company's records is forbidden.");
  }

  try {
    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    // Write audit log
    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userRole: currentUser.role,
      action: "ADMIN_RESET_PASSWORD",
      entity: "user",
      entityId: userId,
      newValue: `Password reset successfully for user: ${targetUser.email}`
    });

    revalidatePath("/settings");
    revalidatePath("/it-management");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to reset user password.");
  }
}

export async function updateTeamLeadNameAction(userId: string, newName: string) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);
  if (!newName || !newName.trim()) {
    throw new Error("Name cannot be empty.");
  }

  const targetUser = await db.user.findUnique({
    where: { id: userId }
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  if (targetUser.role !== "TEAM_LEAD") {
    throw new Error("Target user is not a Team Lead.");
  }

  // Multi-tenant check
  if (currentUser.role !== "SUPER_ADMIN" && targetUser.companyId !== currentUser.companyId) {
    throw new Error("UNAUTHORIZED: Access to another company's records is forbidden.");
  }

  try {
    const oldName = targetUser.name || "";

    // Update User Name
    await db.user.update({
      where: { id: userId },
      data: {
        name: newName,
        updatedAt: new Date(),
      }
    });

    // Find if there's a corresponding employee record and update it
    const emp = await db.employee.findFirst({
      where: { userId }
    });

    if (emp) {
      await db.employee.update({
        where: { id: emp.id },
        data: {
          fullName: newName,
          updatedAt: new Date(),
        }
      });
    }

    // Write audit log
    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userRole: currentUser.role,
      action: "UPDATE_TL_NAME",
      entity: "user",
      entityId: userId,
      oldValue: oldName,
      newValue: newName
    });

    revalidatePath("/settings");
    revalidatePath("/team-leads");
    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update Team Lead profile.");
  }
}

export async function rejectSalesAssociateAction(userId: string) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  if (!userId) {
    throw new Error("User ID is required.");
  }

  const pendingUser = await db.user.findUnique({
    where: { id: userId }
  });

  if (!pendingUser) {
    throw new Error("User not found.");
  }

  if (pendingUser.status !== "PENDING" || pendingUser.role !== "SALES_ASSOCIATE") {
    throw new Error("Target user is not a pending Sales Representative.");
  }

  // Multi-tenant check
  if (currentUser.role !== "SUPER_ADMIN" && pendingUser.companyId !== currentUser.companyId) {
    throw new Error("UNAUTHORIZED: Access to another company's records is forbidden.");
  }

  try {
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        status: "REJECTED",
        updatedAt: new Date()
      }
    });

    // Write audit log
    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userRole: currentUser.role,
      action: "REJECT_ONBOARDING_REQUEST",
      entity: "user",
      entityId: userId,
      newValue: JSON.stringify(updatedUser)
    });

    revalidatePath("/employees");
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to reject onboarding request.");
  }
}

export async function getCompanyTeamLeadsAction() {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);
  
  let companyFilter = {};
  if (currentUser.companyId) {
    companyFilter = { companyId: currentUser.companyId };
  }

  const teamLeads = await db.user.findMany({
    where: {
      ...companyFilter,
      role: "TEAM_LEAD",
      isArchived: false
    },
    select: {
      id: true,
      name: true,
      email: true
    },
    orderBy: {
      name: "asc"
    }
  });

  return { success: true, teamLeads };
}

export async function toggleUserStatusAction(userId: string, newStatus: "APPROVED" | "BLOCKED") {
  console.log(`[toggleUserStatusAction] Start: userId=${userId}, newStatus=${newStatus}`);
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);
  console.log(`[toggleUserStatusAction] Authenticated user: role=${currentUser.role}, companyId=${currentUser.companyId}`);

  const targetUser = await db.user.findUnique({
    where: { id: userId }
  });

  if (!targetUser) {
    console.error(`[toggleUserStatusAction] Target user not found: userId=${userId}`);
    throw new Error("User not found.");
  }
  console.log(`[toggleUserStatusAction] Target user found: role=${targetUser.role}, companyId=${targetUser.companyId}`);

  if (currentUser.role !== "SUPER_ADMIN" && targetUser.companyId !== currentUser.companyId) {
    console.error(`[toggleUserStatusAction] Unauthorized company mismatch: targetUser companyId=${targetUser.companyId}, currentUser companyId=${currentUser.companyId}`);
    throw new Error("UNAUTHORIZED: Access to another company's records is forbidden.");
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        status: newStatus,
        updatedAt: new Date()
      }
    });

    const emp = await db.employee.findFirst({
      where: { userId }
    });

    if (emp) {
      await db.employee.update({
        where: { id: emp.id },
        data: {
          status: newStatus === "APPROVED" ? "ACTIVE" : "INACTIVE",
          updatedAt: new Date()
        }
      });
    }

    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userRole: currentUser.role,
      action: "TOGGLE_USER_STATUS",
      entity: "user",
      entityId: userId,
      newValue: newStatus
    });

    console.log(`[toggleUserStatusAction] Success. Revalidating paths...`);
    revalidatePath("/settings");
    revalidatePath("/team-leads");
    revalidatePath("/employees");
    revalidatePath("/it-management");
    revalidatePath("/it-operational-logs");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error(`[toggleUserStatusAction] Error toggling status:`, error);
    throw new Error(error.message || "Failed to toggle user status.");
  }
}

export async function editUserAccountAction(formData: {
  userId: string;
  name: string;
  password?: string;
  status: "APPROVED" | "BLOCKED";
  role: "TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT";
  teamLeadId?: string | null;
}) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  const targetUser = await db.user.findUnique({
    where: { id: formData.userId }
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  if (currentUser.role !== "SUPER_ADMIN" && targetUser.companyId !== currentUser.companyId) {
    throw new Error("UNAUTHORIZED: Access to another company's records is forbidden.");
  }

  try {
    const oldName = targetUser.name || "";
    const hashedPassword = formData.password ? await hashPassword(formData.password) : undefined;

    await db.user.update({
      where: { id: formData.userId },
      data: {
        name: sanitizeInput(formData.name),
        ...(hashedPassword !== undefined ? { password: hashedPassword } : {}),
        status: formData.status,
        role: formData.role,
        teamLeadId: formData.role === "SALES_ASSOCIATE" ? formData.teamLeadId : null,
        updatedAt: new Date()
      }
    });

    const emp = await db.employee.findFirst({
      where: { userId: formData.userId }
    });

    if (emp) {
      await db.employee.update({
        where: { id: emp.id },
        data: {
          fullName: formData.name,
          status: formData.status === "APPROVED" ? "ACTIVE" : "INACTIVE",
          updatedAt: new Date()
        }
      });
    }

    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userRole: currentUser.role,
      action: "EDIT_USER_ACCOUNT",
      entity: "user",
      entityId: formData.userId,
      oldValue: JSON.stringify({ name: oldName, status: targetUser.status }),
      newValue: JSON.stringify({ name: formData.name, status: formData.status })
    });

    revalidatePath("/settings");
    revalidatePath("/team-leads");
    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update user account.");
  }
}

export async function reassignAssociateAction(associateId: string, newTeamLeadId: string | null) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "IT_DEPARTMENT"]);
  
  const targetUser = await db.user.findUnique({
    where: { id: associateId }
  });
  if (!targetUser) throw new Error("Associate not found.");
  
  // Tenant Isolation Guard
  if (currentUser.role !== "SUPER_ADMIN" && targetUser.companyId !== currentUser.companyId) {
    throw new Error("UNAUTHORIZED: Tenant isolation breach.");
  }
  
  await db.user.update({
    where: { id: associateId },
    data: { teamLeadId: newTeamLeadId }
  });
  
  revalidatePath("/");
  return { success: true };
}

export async function uploadUserAvatarAction(base64Image: string) {
  const user = await enforceAuth();
  
  try {
    // Save base64 Data URL directly in database for 100% reliable rendering
    await db.user.update({
      where: { id: user.id },
      data: { image: base64Image }
    });

    // Also attempt writing file as local fallback if public/uploads exists
    try {
      const fs = await import("fs");
      const path = await import("path");
      const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const imageBuffer = Buffer.from(matches[2], "base64");
        const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const cleanFileName = `avatar_${user.id}_${Date.now()}.png`;
        fs.writeFileSync(path.join(uploadDir, cleanFileName), imageBuffer);
      }
    } catch (fsErr) {
      console.warn("Local disk avatar save skipped (using database base64):", fsErr);
    }
    
    revalidatePath("/");
    revalidatePath("/auth/signin");
    return { success: true, imagePath: base64Image };
  } catch (err: any) {
    console.error("Avatar upload failed:", err);
    return { success: false, error: err.message || "Failed to save avatar image." };
  }
}

export async function deleteTeamLeadAction(teamLeadId: string) {
  const currentUser = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  const targetUser = await db.user.findUnique({
    where: { id: teamLeadId }
  });

  if (!targetUser) {
    throw new Error("Team Lead user not found.");
  }

  if (targetUser.role !== "TEAM_LEAD") {
    throw new Error("Target user is not a Team Lead.");
  }

  if (currentUser.role !== "SUPER_ADMIN" && targetUser.companyId !== currentUser.companyId) {
    throw new Error("UNAUTHORIZED: Tenant isolation breach.");
  }

  // Unassign all mapped Sales Associates
  await db.user.updateMany({
    where: { teamLeadId: teamLeadId },
    data: { teamLeadId: null }
  });

  // Archive and block target Team Lead
  await db.user.update({
    where: { id: teamLeadId },
    data: {
      isArchived: true,
      status: "BLOCKED",
      updatedAt: new Date()
    }
  });

  await logAction({
    userId: currentUser.id,
    userEmail: currentUser.email || "",
    userRole: currentUser.role,
    action: "DELETE_TEAM_LEAD",
    entity: "user",
    entityId: teamLeadId,
    newValue: `Deleted Team Lead: ${targetUser.name || targetUser.email}`
  });

  revalidatePath("/");
  revalidatePath("/team-leads");
  revalidatePath("/my-team");

  return { success: true };
}


