import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import BroadcastComposer from "@/components/BroadcastComposer";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  // Visible to SUPER_ADMIN, COMPANY_OWNER, and IT_DEPARTMENT
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  let companies: { id: string; name: string }[] = [];
  if (user.role === "SUPER_ADMIN") {
    companies = await db.company.findMany({
      where: { isArchived: false },
      select: { id: true, name: true }
    });
  }

  // Fetch announcements history
  const announcements = await db.announcement.findMany({
    where: {
      isArchived: false,
      ...(user.role === "SUPER_ADMIN" ? {} : { companyId: user.companyId || "" })
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
        companies={companies}
        initialAnnouncements={announcements}
      />
    </DashboardLayout>
  );
}
