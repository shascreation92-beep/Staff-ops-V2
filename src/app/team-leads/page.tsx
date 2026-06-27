import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import TeamLeadsDirectory from "@/components/TeamLeadsDirectory";

export const dynamic = "force-dynamic";

export default async function TeamLeadsPage() {
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

  // Fetch Team Leads
  const rawTeamLeads = await db.user.findMany({
    where: {
      ...companyFilter,
      role: "TEAM_LEAD",
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

  // Fetch Sales Associates mapped to these Team Leads
  const teamLeadsWithAssociates = await Promise.all(
    rawTeamLeads.map(async (tl) => {
      const associates = await db.user.findMany({
        where: {
          teamLeadId: tl.id,
          role: "SALES_ASSOCIATE",
          isArchived: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          lastActiveAt: true
        },
        orderBy: {
          name: "asc"
        }
      });

      return {
        ...tl,
        associates
      };
    })
  );

  // Fetch active companies
  const companies = await db.company.findMany({
    where: { isArchived: false, status: "APPROVED" },
    select: { id: true, name: true }
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <div className="dashboard-container" style={{ padding: "2rem" }}>
        <TeamLeadsDirectory 
          teamLeads={teamLeadsWithAssociates} 
          companies={companies}
          currentUserRole={user.role}
        />
      </div>
    </DashboardLayout>
  );
}
