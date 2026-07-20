import { redirect } from "next/navigation";
import { enforceAuth } from "@/lib/auth-helpers";
import { getLeaveRequestsAction } from "@/app/actions/leave-requests";
import LeaveRequestsClient from "./LeaveRequestsClient";

export default async function LeaveRequestsPage() {
  const user = await enforceAuth();

  if (!user) {
    redirect("/auth/signin");
  }

  const initialData = await getLeaveRequestsAction();

  return (
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
  );
}
