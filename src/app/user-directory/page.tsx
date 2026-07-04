import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import UserDirectoryList from "./UserDirectoryList";

export const dynamic = "force-dynamic";

export default async function UserDirectoryPage() {
  const user = await enforceAuth(["IT_DEPARTMENT"]);

  // Determine Company context
  let companyName = "Active Tenant";
  let users: any[] = [];

  if (user.companyId) {
    const comp = await db.company.findUnique({
      where: { id: user.companyId }
    });
    if (comp) companyName = comp.name;

    // Fetch all registered users in this active company who are Team Leads or Sales Associates
    users = await db.user.findMany({
      where: {
        companyId: user.companyId,
        role: {
          in: ["TEAM_LEAD", "SALES_ASSOCIATE"]
        },
        isArchived: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true
      },
      orderBy: {
        name: "asc"
      }
    });
  }

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <div className="dashboard-container" style={{ padding: "2rem" }}>
        <UserDirectoryList initialUsers={users} />
      </div>
    </DashboardLayout>
  );
}
