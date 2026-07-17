import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import UKMarketTrendsList from "@/components/UKMarketTrendsList";
import { getCachedTrendsAction, getTenantTrendsConfigAction } from "@/app/actions/uk-trends";

export const dynamic = "force-dynamic";

export default async function UKMarketTrendsPage() {
  // Enforce server-side authentication
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "SALES_ASSOCIATE", "IT_DEPARTMENT"]);

  // Resolve company details
  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name || null;
  }

  // Load trends from database / cache
  const trendsResult = await getCachedTrendsAction();
  const initialTrends = trendsResult.success && trendsResult.trends ? trendsResult.trends : [];

  // Load tenant preference config
  const configResult = await getTenantTrendsConfigAction();
  const initialConfig = configResult.success && configResult.config ? configResult.config : null;

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <UKMarketTrendsList
        initialTrends={initialTrends as any}
        currentUser={user}
        companyName={companyName}
        initialConfig={initialConfig}
      />
    </DashboardLayout>
  );
}
