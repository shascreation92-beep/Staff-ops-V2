import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { getAllFeedbackAction, getUserFeedbackHistoryAction } from "@/app/actions/feedback";
import DashboardLayout from "@/components/DashboardLayout";
import FeedbackHub from "@/components/FeedbackHub";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const user = await enforceAuth([
    "SUPER_ADMIN",
    "COMPANY_OWNER",
    "TEAM_LEAD",
    "SALES_ASSOCIATE",
    "IT_DEPARTMENT"
  ]);

  const historyRes = await getUserFeedbackHistoryAction();
  const historyList = historyRes.success ? (historyRes.history || []) : [];

  let adminFeedbackList: any[] = [];
  if (["SUPER_ADMIN", "COMPANY_OWNER"].includes(user.role)) {
    const adminRes = await getAllFeedbackAction();
    if (adminRes.success) {
      adminFeedbackList = adminRes.feedbackList || [];
    }
  }

  return (
    <DashboardLayout user={user}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem", width: "100%" }}>
        <FeedbackHub 
          userRole={user.role}
          initialHistory={historyList}
          initialAdminFeedbackList={adminFeedbackList}
        />
      </div>
    </DashboardLayout>
  );
}
