import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import WorkstationTelemetryDashboard from "@/components/WorkstationTelemetryDashboard";

export const dynamic = "force-dynamic";

export default async function WorkstationTelemetryPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  let companyName = "Global System";
  if (user.companyId) {
    const comp = await db.company.findUnique({ where: { id: user.companyId } });
    if (comp) companyName = comp.name;
  }

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <div className="dashboard-container" style={{ padding: "2rem" }}>
        <WorkstationTelemetryDashboard />
      </div>
    </DashboardLayout>
  );
}
