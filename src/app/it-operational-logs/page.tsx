import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import ITOperationalLogsClient from "./ITOperationalLogsClient";
import { getITAgentsWithCountsAction, getParsedAccountsLedgerAction } from "@/app/actions/it-parsed-accounts";
import DashboardLayout from "@/components/DashboardLayout";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ITOperationalLogsPage() {
  const user = await enforceAuth();

  if (!user || (user.role !== "COMPANY_OWNER" && user.role !== "SUPER_ADMIN")) {
    redirect("/");
  }

  // Fetch companyName dynamically
  let companyName: string | null = null;
  if (user.companyId) {
    const comp = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = comp?.name || null;
  }

  // Fetch IT agents details and counts
  const agentsRes = await getITAgentsWithCountsAction();
  const initialLedger = await getParsedAccountsLedgerAction(1);

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <ITOperationalLogsClient
        initialAgents={agentsRes.success ? (agentsRes.agents || []) : []}
        initialAccounts={initialLedger.accounts || []}
        initialTotal={initialLedger.total || 0}
        user={user}
      />
    </DashboardLayout>
  );
}
