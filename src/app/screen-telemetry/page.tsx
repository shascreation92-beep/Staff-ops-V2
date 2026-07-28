import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import ScreenTelemetryDashboard from "@/components/ScreenTelemetryDashboard";

export const dynamic = "force-dynamic";

export default async function ScreenTelemetryPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  // Determine Company context
  let companyFilter: any = {};
  let companyName = "Global System";

  if (user.role !== "SUPER_ADMIN") {
    if (user.companyId) {
      companyFilter = { companyId: user.companyId };
      const comp = await db.company.findUnique({
        where: { id: user.companyId }
      });
      if (comp) companyName = comp.name;
    }
  }

  // Fetch Active Staff Members for selector
  const staffList = await db.user.findMany({
    where: {
      ...companyFilter,
      isArchived: false,
      status: "APPROVED"
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employee: {
        select: {
          employeeId: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <div className="dashboard-container" style={{ padding: "2rem" }}>
        <ScreenTelemetryDashboard
          currentUserRole={user.role}
          staffList={staffList as any}
        />
      </div>
    </DashboardLayout>
  );
}
