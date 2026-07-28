import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import SettingsShard from "@/components/SettingsShard";

export default async function SettingsPage() {
  // Restrict access: Allow Super Admin, Company Owner, IT, Team Lead, and Sales Associate
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT", "TEAM_LEAD", "SALES_ASSOCIATE"]);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  // Fetch rules
  const rulesList = await db.rule.findMany({
    where: user.role === "SUPER_ADMIN" ? {} : {
      companyId: user.companyId || ""
    }
  });
  
  const rulesMap: Record<string, string> = {};
  rulesList.forEach(r => {
    rulesMap[r.key] = r.value;
  });

  // Fetch platforms
  const platforms = await db.platform.findMany({
    where: {
      isArchived: false
    }
  });

  // Fetch companies (for Super Admin rule override and platform target select)
  let companies: any[] = [];
  if (user.role === "SUPER_ADMIN") {
    companies = await db.company.findMany({
      where: {
        isArchived: false,
        status: "APPROVED"
      },
      select: {
        id: true,
        name: true
      }
    });
  }

  // Fetch announcements history
  const announcements = await db.announcement.findMany({
    where: {
      isArchived: false,
      OR: user.role === "SUPER_ADMIN" ? undefined : [
        { companyId: user.companyId },
        { companyId: null }
      ]
    },
    include: {
      company: {
        select: { name: true }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // Fetch pending invitations (pending users with roles TEAM_LEAD or IT_DEPARTMENT)
  const pendingInvitations = await db.user.findMany({
    where: {
      companyId: user.role === "SUPER_ADMIN" ? undefined : (user.companyId || ""),
      status: "PENDING",
      role: { in: ["TEAM_LEAD", "IT_DEPARTMENT"] }
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // Fetch active users in the same company context
  const users = await db.user.findMany({
    where: {
      isArchived: false,
      companyId: user.role === "SUPER_ADMIN" ? undefined : (user.companyId || "")
    },
    include: {
      user: { // self relation for teamLeadId mapping to team lead
        select: { name: true }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <SettingsShard
        currentUser={user}
        platforms={platforms}
        companies={companies}
        rules={rulesMap}
        announcements={announcements}
        pendingInvitations={pendingInvitations}
        users={users}
      />
    </DashboardLayout>
  );
}
