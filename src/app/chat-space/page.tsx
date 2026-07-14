import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import ChatShard from "@/components/ChatShard";

export const dynamic = "force-dynamic";

export default async function ChatSpacePage() {
  const user = await enforceAuth();

  let companyFilter = {};
  let companyName = "Active Tenant";

  if (user.companyId) {
    companyFilter = { companyId: user.companyId };
    const comp = await db.company.findUnique({
      where: { id: user.companyId }
    });
    if (comp) companyName = comp.name;
  }

  // Fetch company colleagues (including team leads, sales associates, etc.)
  // and Super Admin (if this user is not a Super Admin, they can still chat with colleagues + Super Admin)
  const users = await db.user.findMany({
    where: {
      isArchived: false,
      status: "APPROVED",
      OR: [
        companyFilter,
        { role: "SUPER_ADMIN" }
      ]
    },
    include: {
      account_account_createdByIdTouser: {
        where: { isArchived: false },
        include: {
          platform: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  // Fetch all initial messages involving this user
  const initialMessages = await db.chatmessage.findMany({
    where: {
      OR: [
        { senderId: user.id },
        { receiverId: user.id }
      ]
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <style dangerouslySetInnerHTML={{ __html: `
        html, body, .app-container {
          overflow: hidden !important;
          height: 100vh !important;
          max-height: 100vh !important;
        }
        .main-content {
          padding: 0 !important;
          height: 100vh !important;
          max-height: 100vh !important;
          overflow: hidden !important;
        }
        .main-content > div {
          height: 100% !important;
          max-height: 100% !important;
          overflow: hidden !important;
        }
      ` }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <ChatShard 
          currentUser={user} 
          users={users} 
          initialMessages={initialMessages} 
        />
      </div>
    </DashboardLayout>
  );
}
