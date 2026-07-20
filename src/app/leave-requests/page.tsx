import { redirect } from "next/navigation";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import { getLeaveRequestsAction } from "@/app/actions/leave-requests";
import LeaveRequestsClient from "./LeaveRequestsClient";

export const dynamic = "force-dynamic";

export default async function LeaveRequestsPage() {
  const user = await enforceAuth();

  if (!user) {
    redirect("/auth/signin");
  }

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  const initialData = await getLeaveRequestsAction();

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <LeaveRequestsClient
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as any,
          companyId: user.companyId,
          teamLeadId: user.teamLeadId,
        }}
        initialData={initialData as any}
      />
    </DashboardLayout>
  );
}
