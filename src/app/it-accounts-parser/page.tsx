import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import ITAccountsParserClient from "./ITAccountsParserClient";
import { getParsedAccountsLedgerAction } from "@/app/actions/it-parsed-accounts";
import DashboardLayout from "@/components/DashboardLayout";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ITAccountsParserPage() {
  const user = await enforceAuth();
  
  if (!user || user.role !== "IT_DEPARTMENT") {
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

  // Fetch initial paginated ledger for the active IT Agent
  const initialLedger = await getParsedAccountsLedgerAction(1);

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <ITAccountsParserClient 
        initialAccounts={initialLedger.accounts || []} 
        initialTotal={initialLedger.total || 0}
        user={user}
      />
    </DashboardLayout>
  );
}
