import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { getAllFeedbackAction, getUserFeedbackHistoryAction } from "@/app/actions/feedback";
import FeedbackHub from "@/components/FeedbackHub";

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
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem" }}>
      <FeedbackHub 
        userRole={user.role}
        initialHistory={historyList}
        initialAdminFeedbackList={adminFeedbackList}
      />
    </div>
  );
}
