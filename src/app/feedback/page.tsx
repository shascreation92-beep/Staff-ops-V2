import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { getAllFeedbackAction } from "@/app/actions/feedback";
import FeedbackDashboard from "@/components/FeedbackDashboard";

export default async function FeedbackPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  const res = await getAllFeedbackAction();
  const feedbackList = res.success ? (res.feedbackList || []) : [];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem" }}>
      <FeedbackDashboard 
        initialFeedback={feedbackList} 
        userRole={user.role} 
      />
    </div>
  );
}
