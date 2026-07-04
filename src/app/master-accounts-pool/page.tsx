import React, { Suspense } from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import MasterAccountsList from "./MasterAccountsList";

export const dynamic = "force-dynamic";

export default async function MasterAccountsPoolPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  let companyFilter = {};
  let companyName = "Active Tenant";

  if (user.companyId) {
    companyFilter = { companyId: user.companyId };
    const comp = await db.company.findUnique({
      where: { id: user.companyId }
    });
    if (comp) companyName = comp.name;
  }

  // Fetch all accounts strictly scoped to active company context
  const accounts = await db.account.findMany({
    where: {
      ...companyFilter,
      isArchived: false
    },
    include: {
      platform: true,
      user_account_createdByIdTouser: {
        select: {
          name: true,
          email: true,
          role: true,
          user: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // Fetch platforms
  const platforms = await db.platform.findMany({
    where: {
      isArchived: false
    }
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <div className="dashboard-container" style={{ padding: "2rem" }}>
        <Suspense fallback={<div className="text-muted" style={{ padding: "3rem", textAlign: "center" }}>Loading accounts pool...</div>}>
          <MasterAccountsList 
            initialAccounts={accounts} 
            platforms={platforms} 
            currentUserRole={user.role} 
          />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
