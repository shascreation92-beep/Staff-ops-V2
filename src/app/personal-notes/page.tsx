import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import PersonalNotesDashboard from "@/components/PersonalNotesDashboard";

export const dynamic = "force-dynamic";

export default async function PersonalNotesPage() {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD", "IT_DEPARTMENT"]);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  const rawNotes = await db.personalnote.findMany({
    where: { userId: user.id },
    orderBy: [
      { isGlobalPinned: "desc" },
      { isPinned: "desc" },
      { updatedAt: "desc" }
    ]
  });

  const notes = await Promise.all(
    rawNotes.map(async (note) => {
      if (note.isSharedByMe) {
        const clones = await db.personalnote.findMany({
          where: { sharedFromNoteId: note.id },
          select: {
            isAcknowledged: true,
            user: { select: { name: true } }
          }
        });
        const readClones = clones.filter(c => c.isAcknowledged);
        return {
          ...note,
          sharesCount: clones.length,
          readCount: readClones.length,
          readByNames: readClones.map(c => c.user.name || "Sales Representative")
        };
      }
      return {
        ...note,
        sharesCount: 0,
        readCount: 0,
        readByNames: [] as string[]
      };
    })
  );

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <PersonalNotesDashboard initialNotes={notes} user={user} />
    </DashboardLayout>
  );
}
