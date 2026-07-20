import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import CompaniesClient from "./CompaniesClient";

export default async function CompaniesPage() {
  const user = await enforceAuth(["SUPER_ADMIN"]);

  // Fetch all active companies with owner details
  const companies = await db.company.findMany({
    where: {
      isArchived: false
    },
    include: {
      user: {
        where: {
          role: "COMPANY_OWNER",
          isArchived: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          status: true,
          createdAt: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const serializedCompanies = companies.map((c) => ({
    id: c.id,
    name: c.name,
    ownerName: c.ownerName || (c.user[0]?.name ?? "N/A"),
    ownerEmail: c.ownerEmail || (c.user[0]?.email ?? "N/A"),
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    ownerPassword: c.user[0]?.password || ""
  }));

  return (
    <DashboardLayout user={user}>
      <CompaniesClient initialCompanies={serializedCompanies} />
    </DashboardLayout>
  );
}
