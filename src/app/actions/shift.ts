"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { logAction } from "@/lib/auth-helpers";

export async function toggleShiftDutyAction(newStatus: "ON_DUTY" | "ON_BREAK" | "OFF_DUTY", notes?: string) {
  const user = await enforceAuth();

  try {
    const now = new Date();

    // Fetch user's active/last shift duty log
    const activeShift = await db.shiftduty.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });

    if (newStatus === "ON_DUTY") {
      // Clocking In
      await db.shiftduty.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          companyId: user.companyId || null,
          status: "ON_DUTY",
          clockInTime: now,
          createdAt: now,
          updatedAt: now
        }
      });
    } else if (newStatus === "ON_BREAK") {
      // Going on Break
      if (activeShift && activeShift.status === "ON_DUTY") {
        await db.shiftduty.update({
          where: { id: activeShift.id },
          data: {
            status: "ON_BREAK",
            breakStartTime: now,
            updatedAt: now
          }
        });
      }
    } else if (newStatus === "OFF_DUTY") {
      // Clocking Out
      if (activeShift && activeShift.status !== "OFF_DUTY") {
        let totalMins = 0;
        if (activeShift.clockInTime) {
          totalMins = Math.round((now.getTime() - new Date(activeShift.clockInTime).getTime()) / (1000 * 60));
        }

        await db.shiftduty.update({
          where: { id: activeShift.id },
          data: {
            status: "OFF_DUTY",
            clockOutTime: now,
            notes: notes?.trim() || null,
            totalMinutes: totalMins,
            updatedAt: now
          }
        });
      }
    }

    // Update user.dutyStatus on User model
    await db.user.update({
      where: { id: user.id },
      data: {
        dutyStatus: newStatus,
        lastActiveAt: now,
        updatedAt: now
      }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "SHIFT_STATUS_TOGGLE",
      entity: "user",
      entityId: user.id,
      newValue: `Shift duty updated to ${newStatus}`
    });

    revalidatePath("/");
    revalidatePath("/team-live-roster");
    revalidatePath("/my-team");

    return { success: true, dutyStatus: newStatus };
  } catch (error: any) {
    console.error("Failed to toggle shift duty:", error);
    return { success: false, error: error.message || "Failed to update shift duty status." };
  }
}

export async function getUserCurrentDutyAction() {
  const user = await enforceAuth();

  try {
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: { dutyStatus: true }
    });

    const activeShift = await db.shiftduty.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });

    return {
      success: true,
      dutyStatus: userData?.dutyStatus || "OFF_DUTY",
      clockInTime: activeShift?.clockInTime ? activeShift.clockInTime.toISOString() : null,
      breakStartTime: activeShift?.breakStartTime ? activeShift.breakStartTime.toISOString() : null,
      activeShiftId: activeShift?.id || null
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch duty status." };
  }
}

export async function getCompanyDutyAttendanceAction() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"]);

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Build filter for users
    let userFilter: any = {
      isArchived: false,
      status: "APPROVED"
    };

    if (user.role === "COMPANY_OWNER") {
      userFilter.companyId = user.companyId || "";
    } else if (user.role === "TEAM_LEAD") {
      userFilter.teamLeadId = user.id;
    }

    const allMembers = await db.user.findMany({
      where: userFilter,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        dutyStatus: true,
        image: true,
        lastActiveAt: true,
        company: {
          select: { name: true }
        },
        shiftduty: {
          where: {
            createdAt: { gte: todayStart }
          },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { name: "asc" }
    });

    const onDutyMembers = allMembers.filter(m => m.dutyStatus === "ON_DUTY");
    const onBreakMembers = allMembers.filter(m => m.dutyStatus === "ON_BREAK");
    
    // Members who are OFF_DUTY or have no shift today
    const notSignedInMembers = allMembers.filter(m => m.dutyStatus === "OFF_DUTY" || !m.dutyStatus);

    return {
      success: true,
      totalCount: allMembers.length,
      onDutyCount: onDutyMembers.length,
      onBreakCount: onBreakMembers.length,
      notSignedInCount: notSignedInMembers.length,
      onDutyMembers: onDutyMembers.map(m => ({
        id: m.id,
        name: m.name || m.email.split("@")[0],
        email: m.email,
        role: m.role,
        image: m.image,
        clockInTime: m.shiftduty[0]?.clockInTime ? m.shiftduty[0].clockInTime.toISOString() : null,
        companyName: m.company?.name || null
      })),
      onBreakMembers: onBreakMembers.map(m => ({
        id: m.id,
        name: m.name || m.email.split("@")[0],
        email: m.email,
        role: m.role,
        image: m.image,
        breakStartTime: m.shiftduty[0]?.breakStartTime ? m.shiftduty[0].breakStartTime.toISOString() : null,
        companyName: m.company?.name || null
      })),
      notSignedInMembers: notSignedInMembers.map(m => ({
        id: m.id,
        name: m.name || m.email.split("@")[0],
        email: m.email,
        role: m.role,
        image: m.image,
        lastActiveAt: m.lastActiveAt ? m.lastActiveAt.toISOString() : null,
        companyName: m.company?.name || null
      }))
    };
  } catch (error: any) {
    console.error("Failed to fetch company duty attendance:", error);
    return { success: false, error: error.message || "Failed to fetch attendance telemetry." };
  }
}
