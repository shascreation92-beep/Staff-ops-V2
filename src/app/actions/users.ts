"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth, logAction, getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
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
        throw new Error(`Only Sales Associates can be upgraded to Team Lead. User is currently "${existingUser.role}".`);
      }

      if (role !== "TEAM_LEAD") {
        throw new Error("Only Team Lead invitations can be sent to existing Sales Associates.");
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
