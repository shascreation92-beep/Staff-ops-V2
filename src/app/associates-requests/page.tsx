import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import AssociatesRequestsList from "@/components/AssociatesRequestsList";
import { getPendingTLRequestsAction } from "@/app/actions/accounts";

export const dynamic = "force-dynamic";

export default async function AssociatesRequestsPage() {
  const user = await enforceAuth(["TEAM_LEAD"]);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  const requests = await getPendingTLRequestsAction();

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <AssociatesRequestsList requests={requests} />
    </DashboardLayout>
  );
}
