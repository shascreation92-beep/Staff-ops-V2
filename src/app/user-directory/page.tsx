import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import UserDirectoryList from "./UserDirectoryList";

export const dynamic = "force-dynamic";

export default async function UserDirectoryPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT", "TEAM_LEAD"]);

  // Determine Company context
  let companyName = "Active Tenant";
  let users: any[] = [];

  if (user.role === "SUPER_ADMIN") {
    companyName = "Global Platform (Super Admin)";
    users = await db.user.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        image: true
      },
      orderBy: { name: "asc" }
    });
  } else if (user.companyId) {
    const comp = await db.company.findUnique({
      where: { id: user.companyId }
    });
    if (comp) companyName = comp.name;

    users = await db.user.findMany({
      where: {
        companyId: user.companyId,
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
      orderBy: { name: "asc" }
    });
  }

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <div className="dashboard-container" style={{ padding: "2rem" }}>
        <UserDirectoryList initialUsers={users} currentUserRole={user.role} />
      </div>
    </DashboardLayout>
  );
}
