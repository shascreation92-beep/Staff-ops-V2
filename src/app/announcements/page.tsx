import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import BroadcastComposer from "@/components/BroadcastComposer";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  // Visible only to COMPANY_OWNER and IT_DEPARTMENT
  const user = await enforceAuth(["COMPANY_OWNER", "IT_DEPARTMENT"]);

  // Fetch target companies for broadcast scope selection
  const companiesList = await db.company.findMany({
    where: { isArchived: false, status: "APPROVED" },
    select: { id: true, name: true }
  });

  // Fetch announcements history
  const announcements = await db.announcement.findMany({
    where: {
      isArchived: false,
      OR: [
        { companyId: user.companyId || undefined },
        { companyId: null }
      ]
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
        companies={companiesList}
        initialAnnouncements={announcements}
      />
    </DashboardLayout>
  );
}
