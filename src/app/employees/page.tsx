import React from "react";
import { enforceAuth, getCompanyFilter } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import EmployeesList from "@/components/EmployeesList";

export default async function EmployeesPage() {
  // Restrict access: Sales Associates are excluded in middleware, reinforced here
  const user = await enforceAuth(["SUPER_ADMIN", "TEAM_LEAD", "IT_DEPARTMENT"]);
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
  let employeeFilter: any = {
    ...companyFilter,
    isArchived: false
  };

  if (user.role === "TEAM_LEAD") {
    employeeFilter = {
      ...companyFilter,
      isArchived: false,
      user: {
        teamLeadId: user.id,
        role: "SALES_ASSOCIATE"
      }
    };
  }

  const employees = await db.employee.findMany({
    where: employeeFilter,
    include: {
      company: {
        select: { name: true }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // Fetch active Team Leads for assignment dropdown
  const teamLeads = await db.user.findMany({
    where: {
      companyId: user.role === "SUPER_ADMIN" ? undefined : (user.companyId || ""),
      role: "TEAM_LEAD",
      status: "APPROVED",
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
      email: true
    },
    orderBy: {
      name: "asc"
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
        teamLeads={teamLeads}
      />
    </DashboardLayout>
  );
}
