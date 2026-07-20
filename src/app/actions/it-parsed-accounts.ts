"use server";

import { db } from "@/lib/db";
import { enforceAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

// Secure role checker helper
async function checkRole(allowedRoles: string[]) {
  const user = await enforceAuth();
  if (!user || !user.role || !allowedRoles.includes(user.role)) {
    throw new Error("UNAUTHORIZED: Access is restricted to authorized roles.");
  }
  return user;
}

// IT Department Agent: Save parsed accounts
export async function saveParsedAccountsAction(
  accounts: { seriesNumber: string; password: string; name: string }[]
) {
  const user = await checkRole(["IT_DEPARTMENT"]);
  if (!user.companyId) {
    throw new Error("Multi-tenant company ID is missing.");
  }

  if (!accounts || accounts.length === 0) {
    return { success: false, error: "No accounts provided to save." };
  }

  try {
    const dataToInsert = accounts.map((acc) => ({
      id: crypto.randomUUID(),
      seriesNumber: acc.seriesNumber.trim(),
      password: acc.password.trim(),
      name: acc.name.trim(),
      agentId: user.id,
      companyId: user.companyId!,
    }));

    await db.itparsedaccount.createMany({
      data: dataToInsert,
    });

    revalidatePath("/it-accounts-parser");
    revalidatePath("/it-operational-logs");

    return { success: true, count: accounts.length };
  } catch (err: any) {
    console.error("Failed to save parsed accounts:", err);
    return { success: false, error: err.message || "Failed to save records." };
  }
}

// Company Owner: Fetch dynamic list of IT Agents and load counts
export async function getITAgentsWithCountsAction() {
  const user = await checkRole(["COMPANY_OWNER", "SUPER_ADMIN"]);
  if (!user.companyId) {
    return { success: false, error: "Tenant context missing." };
  }

  try {
    // 1. Fetch active users in this tenant with the IT_DEPARTMENT role
    const agents = await db.user.findMany({
      where: {
        role: "IT_DEPARTMENT",
        companyId: user.companyId,
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        lastActiveAt: true,
      },
    });

    // Today's boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 2. Fetch stats for each agent
    const agentsWithCounts = await Promise.all(
      agents.map(async (agent) => {
        const [totalAllTime, totalToday] = await Promise.all([
          db.itparsedaccount.count({
            where: { agentId: agent.id, companyId: user.companyId! },
          }),
          db.itparsedaccount.count({
            where: {
              agentId: agent.id,
              companyId: user.companyId!,
              createdAt: { gte: startOfToday },
            },
          }),
        ]);

        return {
          id: agent.id,
          name: agent.name || "IT Agent",
          email: agent.email,
          image: agent.image,
          lastActiveAt: agent.lastActiveAt,
          totalToday,
          totalAllTime,
        };
      })
    );

    return { success: true, agents: agentsWithCounts };
  } catch (err: any) {
    console.error("Failed to fetch IT agents operational logs counts:", err);
    return { success: false, error: err.message || "Failed to load agent statistics." };
  }
}

// Dynamic ledger query (paginated to 50 ceiling)
export async function getParsedAccountsLedgerAction(page: number = 1, filterAgentId?: string) {
  const user = await enforceAuth();
  if (!user.companyId) {
    return { success: false, error: "Tenant context missing.", total: 0, accounts: [] };
  }

  const limit = 50;
  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {
      companyId: user.companyId,
    };

    // If IT_DEPARTMENT, only allow seeing their own uploaded accounts
    if (user.role === "IT_DEPARTMENT") {
      whereClause.agentId = user.id;
    } else if (filterAgentId) {
      // Owner/Super admin can filter by a specific agent
      whereClause.agentId = filterAgentId;
    }

    const [total, accounts] = await Promise.all([
      db.itparsedaccount.count({ where: whereClause }),
      db.itparsedaccount.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
    ]);

    // Format createdAt as string safely
    const formattedAccounts = accounts.map((acc) => ({
      id: acc.id,
      seriesNumber: acc.seriesNumber,
      password: acc.password,
      name: acc.name,
      createdAt: acc.createdAt.toISOString(),
      agentId: acc.agentId,
      companyId: acc.companyId,
      color: acc.color,
      remarks: acc.remarks,
    }));

    return {
      success: true,
      accounts: formattedAccounts,
      total,
    };
  } catch (err: any) {
    console.error("Failed to load parsed accounts ledger:", err);
    return { success: false, error: err.message || "Failed to fetch ledger.", total: 0, accounts: [] };
  }
}

// Export raw accounts history to CSV string format
export async function exportAgentAccountsCSVAction(agentId: string) {
  const user = await checkRole(["COMPANY_OWNER", "SUPER_ADMIN"]);
  if (!user.companyId) {
    throw new Error("Tenant context missing.");
  }

  try {
    const accounts = await db.itparsedaccount.findMany({
      where: { agentId, companyId: user.companyId },
      orderBy: { createdAt: "desc" },
    });

    // Compile CSV headers and rows
    const headers = "Series Number,Password,Name,Auto-Generated Date,Remarks\n";
    const rows = accounts
      .map(
        (acc) =>
          `"${acc.seriesNumber.replace(/"/g, '""')}","${acc.password.replace(
            /"/g,
            '""'
          )}","${acc.name.replace(/"/g, '""')}","${acc.createdAt.toISOString()}","${(acc.remarks || "").replace(/"/g, '""')}"`
      )
      .join("\n");

    return { success: true, csvData: headers + rows };
  } catch (err: any) {
    console.error("Failed to export agent accounts to CSV:", err);
    return { success: false, error: err.message || "Failed to generate CSV data." };
  }
}

// Update parsed account color (highlight)
export async function updateParsedAccountColorAction(id: string, color: string | null) {
  const user = await checkRole(["IT_DEPARTMENT"]);
  try {
    await db.itparsedaccount.update({
      where: { id, agentId: user.id },
      data: { color },
    });
    revalidatePath("/it-accounts-parser");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update account color:", err);
    return { success: false, error: err.message || "Failed to update color." };
  }
}

// Update parsed account remarks
export async function updateParsedAccountRemarksAction(id: string, remarks: string | null) {
  const user = await checkRole(["IT_DEPARTMENT"]);
  try {
    await db.itparsedaccount.update({
      where: { id, agentId: user.id },
      data: { remarks },
    });
    revalidatePath("/it-accounts-parser");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update account remarks:", err);
    return { success: false, error: err.message || "Failed to update remarks." };
  }
}

// Bulk update parsed accounts color
export async function bulkUpdateParsedAccountsColorAction(ids: string[], color: string | null) {
  const user = await checkRole(["IT_DEPARTMENT"]);
  try {
    await db.itparsedaccount.updateMany({
      where: { 
        id: { in: ids },
        agentId: user.id 
      },
      data: { color },
    });
    revalidatePath("/it-accounts-parser");
    return { success: true };
  } catch (err: any) {
    console.error("Failed bulk updating account colors:", err);
    return { success: false, error: err.message || "Failed bulk updating colors." };
  }
}
