import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import BroadcastComposer from "@/components/BroadcastComposer";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  // Visible only to COMPANY_OWNER and IT_DEPARTMENT
  const user = await enforceAuth(["COMPANY_OWNER", "IT_DEPARTMENT"]);

  if (!user.companyId) {
    throw new Error("Active company context missing.");
  }

  // Fetch announcements history strictly scoped under current company tenant
  const announcements = await db.announcement.findMany({
    where: {
      isArchived: false,
      companyId: user.companyId
    },
    include: {
      company: {
        select: { name: true }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <DashboardLayout user={user}>
      <BroadcastComposer 
        currentUser={user}
        companies={[]}
        initialAnnouncements={announcements}
      />
    </DashboardLayout>
  );
}
