import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import ITOperationalLogsClient from "./ITOperationalLogsClient";
import { getITAgentsWithCountsAction, getParsedAccountsLedgerAction } from "@/app/actions/it-parsed-accounts";

export default async function ITOperationalLogsPage() {
  const user = await enforceAuth();

  if (!user || (user.role !== "COMPANY_OWNER" && user.role !== "SUPER_ADMIN")) {
    redirect("/");
  }

  // Fetch IT agents details and counts
  const agentsRes = await getITAgentsWithCountsAction();
  const initialLedger = await getParsedAccountsLedgerAction(1);

  return (
    <ITOperationalLogsClient
      initialAgents={agentsRes.success ? (agentsRes.agents || []) : []}
      initialAccounts={initialLedger.accounts || []}
      initialTotal={initialLedger.total || 0}
      user={user}
    />
  );
}
