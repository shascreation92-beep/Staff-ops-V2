import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import PersonalNotesDashboard from "@/components/PersonalNotesDashboard";

export const dynamic = "force-dynamic";

export default async function PersonalNotesPage() {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  const notes = await db.personalnote.findMany({
    where: { userId: user.id },
    orderBy: [
      { isPinned: "desc" },
      { updatedAt: "desc" }
    ]
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <PersonalNotesDashboard initialNotes={notes} user={user} />
    </DashboardLayout>
  );
}
