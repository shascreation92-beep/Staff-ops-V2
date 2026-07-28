import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import AttendanceDashboard from "@/components/AttendanceDashboard";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <AttendanceDashboard user={user} />
    </DashboardLayout>
  );
}
