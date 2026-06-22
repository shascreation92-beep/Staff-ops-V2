import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import ChatShard from "@/components/ChatShard";

export default async function ChatPage() {
  const user = await enforceAuth();

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  // Fetch users scoped to company context, plus Super Admin support account
  const users = await db.user.findMany({
    where: {
      isArchived: false,
      OR: user.role === "SUPER_ADMIN" ? [{}] : [
        { companyId: user.companyId },
        { role: "SUPER_ADMIN" }
      ]
    },
    orderBy: {
      name: "asc"
    }
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <ChatShard
        currentUser={user}
        users={users}
        initialMessages={[]}
      />
    </DashboardLayout>
  );
}
