import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { getTeamPerformanceStatsAction } from "@/app/actions/team-stats";
import DashboardLayout from "@/components/DashboardLayout";
import TeamPerformanceStatsView from "@/components/TeamPerformanceStatsView";

export const dynamic = "force-dynamic";

export default async function TeamPerformanceStatsPage() {
  const user = await enforceAuth(["TEAM_LEAD", "SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  const res = await getTeamPerformanceStatsAction();
  const teamStats = res.success ? (res.teamStats || []) : [];

  return (
    <DashboardLayout user={user}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem", width: "100%" }}>
        <TeamPerformanceStatsView 
          initialStats={teamStats}
          currentUserRole={user.role}
        />
      </div>
    </DashboardLayout>
  );
}
