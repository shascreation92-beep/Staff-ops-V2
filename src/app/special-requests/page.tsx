import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import SpecialRequestsList from "@/components/SpecialRequestsList";
import { getSpecialRequestsAction } from "@/app/actions/special-requests";

export const dynamic = "force-dynamic";

export default async function SpecialRequestsPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  const requests = await getSpecialRequestsAction();

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <SpecialRequestsList initialRequests={requests} currentUser={user} />
    </DashboardLayout>
  );
}
