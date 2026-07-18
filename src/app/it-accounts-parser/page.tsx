import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import ITAccountsParserClient from "./ITAccountsParserClient";
import { getParsedAccountsLedgerAction } from "@/app/actions/it-parsed-accounts";

export default async function ITAccountsParserPage() {
  const user = await enforceAuth();
  
  if (!user || user.role !== "IT_DEPARTMENT") {
    redirect("/");
  }

  // Fetch initial paginated ledger for the active IT Agent
  const initialLedger = await getParsedAccountsLedgerAction(1);

  return (
    <ITAccountsParserClient 
      initialAccounts={initialLedger.accounts || []} 
      initialTotal={initialLedger.total || 0}
      user={user}
    />
  );
}
