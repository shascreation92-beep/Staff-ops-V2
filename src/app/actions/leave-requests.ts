"use server";

import { db } from "@/lib/db";
import { enforceAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

// Helper for notifying company owners & super admins
async function notifyCompanyOwners(companyId: string, title: string, message: string, type: string = "LEAVE") {
  try {
    const owners = await db.user.findMany({
      where: {
        companyId,
        role: { in: ["COMPANY_OWNER", "SUPER_ADMIN"] },
        isArchived: false,
      },
      select: { id: true },
    });

    if (owners.length > 0) {
      await db.notification.createMany({
        data: owners.map(o => ({
          id: crypto.randomUUID(),
          userId: o.id,
          title,
          message,
          type,
          isRead: false,
        })),
      });
    }
  } catch (err) {
    console.error("Failed to notify company owners:", err);
  }
}

// 1. Create a new leave request
export async function createLeaveRequestAction(data: {
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  emergencyContact?: string;
}) {
  const user = await enforceAuth();
  if (!user || !user.companyId) {
    return { success: false, error: "Unauthorized or missing company context." };
  }

  try {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: "Invalid start or end date." };
    }

    if (end < start) {
      return { success: false, error: "End date cannot be earlier than start date." };
    }

    // Determine initial status based on role
    const isTeamLeadOrAbove = ["TEAM_LEAD", "COMPANY_OWNER", "SUPER_ADMIN"].includes(user.role);
    const initialStatus = isTeamLeadOrAbove ? "PENDING_COMPANY" : "PENDING_TL";

    const leave = await db.leaverequest.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        companyId: user.companyId,
        teamLeadId: user.teamLeadId || null,
        leaveType: data.leaveType,
        startDate: start,
        endDate: end,
        totalDays: Math.max(1, data.totalDays),
        reason: data.reason.trim(),
        emergencyContact: data.emergencyContact?.trim() || null,
        status: initialStatus,
      },
    });

    // In-app Notification Triggers
    if (initialStatus === "PENDING_TL" && user.teamLeadId) {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.teamLeadId,
          title: "New Leave Request Awaiting TL Review",
          message: `${user.name || "Sales Associate"} requested ${leave.totalDays} day(s) of leave (${data.leaveType}).`,
          type: "LEAVE",
          isRead: false,
        },
      });
    } else if (initialStatus === "PENDING_COMPANY") {
      await notifyCompanyOwners(
        user.companyId,
        "New Leave Request Awaiting Company Approval",
        `${user.name || "Team Lead"} requested ${leave.totalDays} day(s) of leave (${data.leaveType}).`
      );
    }

    revalidatePath("/leave-requests");
    return { success: true, leave };
  } catch (err: any) {
    console.error("Failed to create leave request:", err);
    return { success: false, error: err.message || "Failed to submit leave request." };
  }
}

// 2. Fetch leave requests (User's own leaves + Approvals list based on role)
export async function getLeaveRequestsAction() {
  const user = await enforceAuth();
  if (!user || !user.companyId) {
    return { success: false, error: "Unauthorized", myLeaves: [], pendingApprovals: [], allHistory: [] };
  }

  try {
    // Fetch user's own submitted leaves
    const myLeaves = await db.leaverequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, image: true },
        },
      },
    });

    let pendingApprovals: any[] = [];
    let allHistory: any[] = [];

    if (user.role === "TEAM_LEAD") {
      // Pending requests for Team Lead (Associates under this Team Lead)
      pendingApprovals = await db.leaverequest.findMany({
        where: {
          companyId: user.companyId,
          teamLeadId: user.id,
          status: "PENDING_TL",
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, image: true },
          },
        },
      });
    } else if (["COMPANY_OWNER", "SUPER_ADMIN"].includes(user.role)) {
      // Pending requests for Company (Either approved by TL or submitted by TL directly)
      pendingApprovals = await db.leaverequest.findMany({
        where: {
          companyId: user.companyId,
          status: "PENDING_COMPANY",
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, image: true },
          },
        },
      });

      // Entire company leave history for owner review
      allHistory = await db.leaverequest.findMany({
        where: { companyId: user.companyId },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, image: true },
          },
        },
      });
    }

    return {
      success: true,
      myLeaves,
      pendingApprovals,
      allHistory,
    };
  } catch (err: any) {
    console.error("Failed to load leave requests:", err);
    return { success: false, error: err.message, myLeaves: [], pendingApprovals: [], allHistory: [] };
  }
}

// 3. Update Leave Request Status (Approve / Reject)
export async function updateLeaveRequestStatusAction(
  leaveId: string,
  action: "APPROVE" | "REJECT",
  notes?: string
) {
  const user = await enforceAuth();
  if (!user || !user.companyId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const leave = await db.leaverequest.findUnique({
      where: { id: leaveId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!leave) {
      return { success: false, error: "Leave request not found." };
    }

    const applicantName = leave.user.name || "Employee";

    // Handle Team Lead Action
    if (leave.status === "PENDING_TL") {
      if (user.role !== "TEAM_LEAD" && !["COMPANY_OWNER", "SUPER_ADMIN"].includes(user.role)) {
        return { success: false, error: "Only Team Leads or Owners can act on this stage." };
      }

      if (action === "APPROVE") {
        const updated = await db.leaverequest.update({
          where: { id: leaveId },
          data: {
            status: "PENDING_COMPANY",
            tlNotes: notes?.trim() || null,
            tlActionAt: new Date(),
          },
        });

        // Notify Company Owners for final step
        await notifyCompanyOwners(
          user.companyId,
          "Leave Approved by TL - Final Approval Needed",
          `Team Lead ${user.name || "TL"} approved ${applicantName}'s leave (${leave.totalDays} days). Final approval required.`
        );

        // Notify Applicant
        await db.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: leave.userId,
            title: "Leave Request Approved by Team Lead",
            message: `Your leave request (${leave.totalDays} days) was approved by your Team Lead and forwarded to Company Management.`,
            type: "LEAVE",
            isRead: false,
          },
        });

        revalidatePath("/leave-requests");
        return { success: true, leave: updated };
      } else {
        const updated = await db.leaverequest.update({
          where: { id: leaveId },
          data: {
            status: "REJECTED",
            tlNotes: notes?.trim() || null,
            tlActionAt: new Date(),
          },
        });

        // Notify Applicant of Rejection
        await db.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: leave.userId,
            title: "Leave Request Rejected by Team Lead",
            message: `Your leave request was rejected by your Team Lead. Notes: ${notes || "No notes provided."}`,
            type: "LEAVE",
            isRead: false,
          },
        });

        revalidatePath("/leave-requests");
        return { success: true, leave: updated };
      }
    }

    // Handle Company Owner / Admin Action
    if (leave.status === "PENDING_COMPANY") {
      if (!["COMPANY_OWNER", "SUPER_ADMIN"].includes(user.role)) {
        return { success: false, error: "Only Company Owners or Admins can act on this stage." };
      }

      if (action === "APPROVE") {
        const updated = await db.leaverequest.update({
          where: { id: leaveId },
          data: {
            status: "APPROVED",
            companyNotes: notes?.trim() || null,
            companyActionAt: new Date(),
          },
        });

        // Notify Applicant of Final Approval
        await db.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: leave.userId,
            title: "🎉 Leave Request Fully Approved!",
            message: `Your leave request for ${leave.totalDays} day(s) has been approved by Company Management.`,
            type: "LEAVE",
            isRead: false,
          },
        });

        // Notify Team Lead if applicable
        if (leave.teamLeadId) {
          await db.notification.create({
            data: {
              id: crypto.randomUUID(),
              userId: leave.teamLeadId,
              title: "Leave Request Approved by Company",
              message: `${applicantName}'s leave request for ${leave.totalDays} day(s) was approved by Company Management.`,
              type: "LEAVE",
              isRead: false,
            },
          });
        }

        revalidatePath("/leave-requests");
        return { success: true, leave: updated };
      } else {
        const updated = await db.leaverequest.update({
          where: { id: leaveId },
          data: {
            status: "REJECTED",
            companyNotes: notes?.trim() || null,
            companyActionAt: new Date(),
          },
        });

        // Notify Applicant of Rejection
        await db.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: leave.userId,
            title: "Leave Request Rejected by Company",
            message: `Your leave request was rejected by Company Management. Notes: ${notes || "No notes provided."}`,
            type: "LEAVE",
            isRead: false,
          },
        });

        // Notify Team Lead if applicable
        if (leave.teamLeadId) {
          await db.notification.create({
            data: {
              id: crypto.randomUUID(),
              userId: leave.teamLeadId,
              title: "Leave Request Rejected by Company",
              message: `${applicantName}'s leave request was rejected by Company Management.`,
              type: "LEAVE",
              isRead: false,
            },
          });
        }

        revalidatePath("/leave-requests");
        return { success: true, leave: updated };
      }
    }

    return { success: false, error: "Leave request is not in a pending action state." };
  } catch (err: any) {
    console.error("Failed to update leave request status:", err);
    return { success: false, error: err.message || "Failed to update leave status." };
  }
}

// 4. Re-submit a rejected leave request
export async function reSubmitLeaveRequestAction(
  leaveId: string,
  data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    emergencyContact?: string;
  }
) {
  const user = await enforceAuth();
  if (!user || !user.companyId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const leave = await db.leaverequest.findUnique({
      where: { id: leaveId },
    });

    if (!leave || leave.userId !== user.id) {
      return { success: false, error: "Leave request not found or access denied." };
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: "Invalid start or end date." };
    }

    const isTeamLeadOrAbove = ["TEAM_LEAD", "COMPANY_OWNER", "SUPER_ADMIN"].includes(user.role);
    const initialStatus = isTeamLeadOrAbove ? "PENDING_COMPANY" : "PENDING_TL";

    const updated = await db.leaverequest.update({
      where: { id: leaveId },
      data: {
        leaveType: data.leaveType,
        startDate: start,
        endDate: end,
        totalDays: Math.max(1, data.totalDays),
        reason: data.reason.trim(),
        emergencyContact: data.emergencyContact?.trim() || null,
        status: initialStatus,
        tlNotes: null,
        tlActionAt: null,
        companyNotes: null,
        companyActionAt: null,
      },
    });

    // In-app Notification Triggers
    if (initialStatus === "PENDING_TL" && user.teamLeadId) {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.teamLeadId,
          title: "Leave Request Re-submitted",
          message: `${user.name || "Sales Associate"} re-submitted a leave request (${updated.totalDays} days).`,
          type: "LEAVE",
          isRead: false,
        },
      });
    } else if (initialStatus === "PENDING_COMPANY") {
      await notifyCompanyOwners(
        user.companyId,
        "Leave Request Re-submitted",
        `${user.name || "Team Lead"} re-submitted a leave request (${updated.totalDays} days).`
      );
    }

    revalidatePath("/leave-requests");
    return { success: true, leave: updated };
  } catch (err: any) {
    console.error("Failed to re-submit leave request:", err);
    return { success: false, error: err.message || "Failed to re-submit request." };
  }
}

// 5. Dynamic count helper for Sidebar badge
export async function getPendingLeaveApprovalsCountAction() {
  const user = await enforceAuth();
  if (!user || !user.companyId) {
    return { count: 0 };
  }

  try {
    let count = 0;
    if (user.role === "TEAM_LEAD") {
      count = await db.leaverequest.count({
        where: {
          companyId: user.companyId,
          teamLeadId: user.id,
          status: "PENDING_TL",
        },
      });
    } else if (["COMPANY_OWNER", "SUPER_ADMIN"].includes(user.role)) {
      count = await db.leaverequest.count({
        where: {
          companyId: user.companyId,
          status: "PENDING_COMPANY",
        },
      });
    }

    return { count };
  } catch (err) {
    return { count: 0 };
  }
}
