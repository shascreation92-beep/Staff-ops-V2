import React from "react";
import { enforceAuth, getCompanyFilter } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import AccountsList from "@/components/AccountsList";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await enforceAuth();
  const companyFilter = getCompanyFilter(user);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  // Fetch accounts scoped to company (or personal if Team Lead / Sales Associate)
  const accountsFilter = (user.role === "TEAM_LEAD" || user.role === "SALES_ASSOCIATE")
    ? { createdById: user.id, isArchived: false }
    : { ...companyFilter, isArchived: false };

  const accounts = await db.account.findMany({
    where: accountsFilter,
    include: {
      platform: true,
      company: {
        select: { name: true }
      },
      user_account_createdByIdTouser: {
        select: { name: true, email: true, role: true }
      },
      user_account_updatedByIdTouser: {
        select: { name: true, email: true }
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

  // Fetch companies (for Super Admin provisioning selection)
  let companies: any[] = [];
  if (user.role === "SUPER_ADMIN") {
    companies = await db.company.findMany({
      where: {
        isArchived: false,
        status: "APPROVED"
      },
      select: {
        id: true,
        name: true
      }
    });
  }

  // Fetch rules for threshold check
  const rulesList = await db.rule.findMany({
    where: user.role === "SUPER_ADMIN" ? {} : {
      companyId: user.companyId || ""
    }
  });
  
  const rulesMap: Record<string, string> = {};
  rulesList.forEach(r => {
    rulesMap[r.key] = r.value;
  });

  // Calculate duplicate ID Name counts across current records
  const idNameCounts = await db.account.groupBy({
    by: ['idName'],
    where: accountsFilter,
    _count: {
      idName: true
    }
  });

  const duplicateMap: Record<string, number> = {};
  idNameCounts.forEach(item => {
    duplicateMap[item.idName] = item._count.idName;
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <AccountsList
        currentUser={user}
        accounts={accounts}
        platforms={platforms}
        companies={companies}
        rules={rulesMap}
        duplicateMap={duplicateMap}
      />
    </DashboardLayout>
  );
}
