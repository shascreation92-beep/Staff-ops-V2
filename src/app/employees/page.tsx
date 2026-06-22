import React from "react";
import { enforceAuth, getCompanyFilter } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import EmployeesList from "@/components/EmployeesList";

export default async function EmployeesPage() {
  // Restrict access: Sales Associates are excluded in middleware, reinforced here
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD", "IT_DEPARTMENT"]);
  const companyFilter = getCompanyFilter(user);

  let companyName = null;
  if (user.companyId) {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true }
    });
    companyName = company?.name;
  }

  // Fetch employees
  const employees = await db.employee.findMany({
    where: {
      ...companyFilter,
      isArchived: false
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

  // Fetch companies (for Super Admin selection)
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

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <EmployeesList
        currentUser={user}
        employees={employees}
        companies={companies}
      />
    </DashboardLayout>
  );
}
