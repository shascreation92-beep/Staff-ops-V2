"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth, logAction } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateTicketSchema = z.object({
  category: z.enum(["IT", "COMPANY"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  ccUserIds: z.array(z.string()).optional()
});

export async function createSpecialRequestAction(formData: z.infer<typeof CreateTicketSchema>) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]);

  // Validation
  const result = CreateTicketSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { category, priority, title, description, ccUserIds } = result.data;
  let companyId = user.companyId;

  if (!companyId && user.role === "SUPER_ADMIN") {
    const defaultCompany = await db.company.findFirst({
      where: { isArchived: false }
    });
    companyId = defaultCompany?.id || "";
  }

  if (!companyId) {
    throw new Error("No company context found.");
  }

  const ticketId = crypto.randomUUID();

  try {
    const newRequest = await db.specialrequest.create({
      data: {
        id: ticketId,
        companyId,
        requesterId: user.id,
        category,
        priority,
        title,
        description,
        status: "PENDING",
        ccUserIds: ccUserIds && ccUserIds.length > 0 ? JSON.stringify(ccUserIds) : null
      }
    });

    // Audit log
    await logAction({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "CREATE_SPECIAL_REQUEST",
      entity: "specialrequest",
      entityId: ticketId,
      newValue: `Created ticket: "${title}" (Priority: ${priority}, Category: ${category})`
    });

    // Create notifications for the recipient group in the company
    const recipientRole = category === "IT" ? "IT_DEPARTMENT" : "COMPANY_OWNER";
    const managers = await db.user.findMany({
      where: {
        companyId,
        role: recipientRole,
        isArchived: false
      }
    });

    if (managers.length > 0) {
      await db.notification.createMany({
        data: managers.map(mgr => ({
          id: crypto.randomUUID(),
          userId: mgr.id,
          title: `New Special Request: ${title}`,
          message: `${user.name || "An employee"} submitted a ${priority} ticket under ${category}.`,
          type: "SPECIAL_REQUEST",
          isRead: false,
          isArchived: false
        }))
      });
    }

    // Create notifications for CC'd users
    if (ccUserIds && ccUserIds.length > 0) {
      await db.notification.createMany({
        data: ccUserIds.map(uid => ({
          id: crypto.randomUUID(),
          userId: uid,
          title: `CC'd on Support Request: ${title}`,
          message: `${user.name || "A colleague"} looped you into a ticket under ${category}.`,
          type: "SPECIAL_REQUEST",
          isRead: false,
          isArchived: false
        }))
      });
    }

    revalidatePath("/special-requests");
    return { success: true, ticket: newRequest };
  } catch (error: any) {
    console.error("Failed to create special request:", error);
    throw new Error(error.message || "Failed to create special request.");
  }
}

export async function updateSpecialRequestStatusAction(
  requestId: string,
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED",
  notes?: string
) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  try {
    const ticket = await db.specialrequest.findUnique({
      where: { id: requestId },
      include: { requester: true }
    });

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    // Role protection - IT Dept can only manage IT tickets, Company Owner can only manage Company tickets
    if (user.role === "IT_DEPARTMENT" && ticket.category !== "IT") {
      throw new Error("IT Department can only update IT tickets.");
    }
    if (user.role === "COMPANY_OWNER" && ticket.category !== "COMPANY") {
      throw new Error("Company Owner can only update Company administrative tickets.");
    }

    const updatedRequest = await db.specialrequest.update({
      where: { id: requestId },
      data: {
        status,
        notes: notes || undefined
      }
    });

    // Log update
    await logAction({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "UPDATE_SPECIAL_REQUEST",
      entity: "specialrequest",
      entityId: requestId,
      newValue: `Updated ticket "${ticket.title}" status to ${status}`
    });

    // Notify requester
    await db.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: ticket.requesterId,
        title: `Ticket Status Update: ${status}`,
        message: `Your ticket "${ticket.title}" status has been set to ${status} by ${user.name || "admin"}.`,
        type: "SPECIAL_REQUEST",
        isRead: false,
        isArchived: false
      }
    });

    // Notify CC'd users if any
    if (ticket.ccUserIds) {
      try {
        const ccIds: string[] = JSON.parse(ticket.ccUserIds);
        if (ccIds.length > 0) {
          await db.notification.createMany({
            data: ccIds.map(uid => ({
              id: crypto.randomUUID(),
              userId: uid,
              title: `CC Ticket Status Update: ${status}`,
              message: `Ticket "${ticket.title}" you are CC'd on was updated to ${status}.`,
              type: "SPECIAL_REQUEST",
              isRead: false,
              isArchived: false
            }))
          });
        }
      } catch (err) {
        console.error("Failed to parse ccUserIds for notifications", err);
      }
    }

    revalidatePath("/special-requests");
    return { success: true, ticket: updatedRequest };
  } catch (error: any) {
    console.error("Failed to update ticket status:", error);
    throw new Error(error.message || "Failed to update ticket status.");
  }
}

export async function getSpecialRequestsAction() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]);

  try {
    if (user.role === "SUPER_ADMIN") {
      return await db.specialrequest.findMany({
        include: { requester: true },
        orderBy: { createdAt: "desc" }
      });
    }

    // Non-Super Admins are scoped to their companyId
    const companyId = user.companyId;
    if (!companyId) {
      return [];
    }

    if (user.role === "COMPANY_OWNER") {
      // Company Owner gets all tickets in their company
      return await db.specialrequest.findMany({
        where: { companyId },
        include: { requester: true },
        orderBy: { createdAt: "desc" }
      });
    }

    if (user.role === "IT_DEPARTMENT") {
      // IT gets only IT tickets
      return await db.specialrequest.findMany({
        where: { companyId, category: "IT" },
        include: { requester: true },
        orderBy: { createdAt: "desc" }
      });
    }

    // Sales Associates and Team Leads only see tickets they created OR are CC'd on
    return await db.specialrequest.findMany({
      where: {
        companyId,
        OR: [
          { requesterId: user.id },
          { ccUserIds: { contains: user.id } }
        ]
      },
      include: { requester: true },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Failed to fetch special requests:", error);
    return [];
  }
}

export async function getSpecialRequestsBadgeStatusAction() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]);

  try {
    // 1. Fetch all unread notifications of type SPECIAL_REQUEST for this user
    const unreadNotifications = await db.notification.findMany({
      where: {
        userId: user.id,
        type: "SPECIAL_REQUEST",
        isRead: false
      }
    });

    if (unreadNotifications.length === 0) {
      return { hasUnread: false, dotColor: null };
    }

    // 2. Query tickets in the user's scope to find the highest priority among the unread notifications
    let tickets: any[] = [];
    if (user.role === "SUPER_ADMIN") {
      tickets = await db.specialrequest.findMany({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } });
    } else if (user.role === "COMPANY_OWNER") {
      tickets = await db.specialrequest.findMany({ where: { companyId: user.companyId } });
    } else if (user.role === "IT_DEPARTMENT") {
      tickets = await db.specialrequest.findMany({ where: { companyId: user.companyId, category: "IT" } });
    } else {
      tickets = await db.specialrequest.findMany({
        where: {
          OR: [
            { requesterId: user.id },
            { ccUserIds: { contains: user.id } }
          ]
        }
      });
    }

    let hasUrgent = false;
    let hasPendingOrMedium = false;
    let hasNormal = false;

    for (const notif of unreadNotifications) {
      const msgUpper = notif.message.toUpperCase();
      const titleUpper = notif.title.toUpperCase();

      if (msgUpper.includes("URGENT") || titleUpper.includes("URGENT")) {
        hasUrgent = true;
      } else if (
        msgUpper.includes("HIGH") || 
        msgUpper.includes("MEDIUM") || 
        msgUpper.includes("PENDING") ||
        msgUpper.includes("IN_PROGRESS") ||
        titleUpper.includes("HIGH") ||
        titleUpper.includes("MEDIUM") ||
        titleUpper.includes("PENDING") ||
        titleUpper.includes("IN_PROGRESS")
      ) {
        hasPendingOrMedium = true;
      } else {
        hasNormal = true;
      }
    }

    // Fallback: If we couldn't determine from notification message texts, check active tickets priorities
    if (!hasUrgent && !hasPendingOrMedium && !hasNormal) {
      const activeTickets = tickets.filter(t => t.status === "PENDING" || t.status === "IN_PROGRESS");
      if (activeTickets.some(t => t.priority === "URGENT")) {
        hasUrgent = true;
      } else if (activeTickets.some(t => t.priority === "HIGH" || t.priority === "MEDIUM")) {
        hasPendingOrMedium = true;
      } else if (activeTickets.some(t => t.priority === "LOW")) {
        hasNormal = true;
      }
    }

    let dotColor: "red" | "orange" | "green" = "green";
    if (hasUrgent) {
      dotColor = "red";
    } else if (hasPendingOrMedium) {
      dotColor = "orange";
    }

    return {
      hasUnread: true,
      dotColor
    };
  } catch (error) {
    console.error("Failed to query special requests badge status:", error);
    return { hasUnread: false, dotColor: null };
  }
}

export async function markSpecialRequestsAsReadAction() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]);

  try {
    await db.notification.updateMany({
      where: {
        userId: user.id,
        type: "SPECIAL_REQUEST",
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    revalidatePath("/special-requests");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to mark ticket notifications as read:", error);
    throw new Error(error.message || "Failed to mark notifications as read.");
  }
}
