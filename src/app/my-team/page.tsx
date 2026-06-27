import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import MyTeamDirectory from "@/components/MyTeamDirectory";
import { getTLTeamMembersAction } from "@/app/actions/accounts";

export default async function MyTeamPage() {
  const user = await enforceAuth(["TEAM_LEAD"]);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  const members = await getTLTeamMembersAction();

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <MyTeamDirectory members={members} />
    </DashboardLayout>
  );
}
