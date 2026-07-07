import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import ITManagementDirectory from "@/components/ITManagementDirectory";

export const dynamic = "force-dynamic";

export default async function ITManagementPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  // Determine Company context
  let companyFilter = {};
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

  // Fetch IT Personnel
  const itPersonnel = await db.user.findMany({
    where: {
      ...companyFilter,
      role: "IT_DEPARTMENT",
      isArchived: false
    },
    include: {
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

  // Fetch active companies
  const companies = await db.company.findMany({
    where: { isArchived: false, status: "APPROVED" },
    select: { id: true, name: true }
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <div className="dashboard-container" style={{ padding: "2rem" }}>
        <ITManagementDirectory 
          itPersonnel={itPersonnel} 
          companies={companies}
          currentUserRole={user.role}
          currentUserCompanyId={user.companyId}
        />
      </div>
    </DashboardLayout>
  );
}
