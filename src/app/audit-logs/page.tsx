import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import AuditLogsView from "@/components/AuditLogsView";

export default async function AuditLogsPage() {
  // Restrict access: Only Super Admins can access audit logs
  const user = await enforceAuth(["SUPER_ADMIN"]);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  // Query audit logs
  const auditLogs = await db.auditlog.findMany({
    orderBy: {
      createdAt: "desc"
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    take: 50
  });

  // Query login logs
  const loginLogs = await db.loginlog.findMany({
    orderBy: {
      loginTime: "desc"
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    take: 50
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <AuditLogsView
        auditLogs={auditLogs}
        loginLogs={loginLogs}
      />
    </DashboardLayout>
  );
}
