import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import DashboardLayout from "@/components/DashboardLayout";
import SystemHealthDashboard from "@/components/SystemHealthDashboard";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  return (
    <DashboardLayout activeItem="system-health">
      <SystemHealthDashboard />
    </DashboardLayout>
  );
}
