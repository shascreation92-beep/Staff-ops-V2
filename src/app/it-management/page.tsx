import React from "react";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import ITManagementDirectory from "@/components/ITManagementDirectory";
import { decryptCredential } from "@/lib/security";

export const dynamic = "force-dynamic";

export default async function ITManagementPage() {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"]);

  // Determine Company context
  let companyFilter = {};
  let companyName = "Global System";

  if (user.role !== "SUPER_ADMIN") {
    if (user.companyId) {
      companyFilter = { companyId: user.companyId };
      const comp = await db.company.findUnique({
        where: { id: user.companyId }
      });
      if (comp) companyName = comp.name;
    }
  }

  // Fetch IT Personnel
  const rawItPersonnel = await db.user.findMany({
    where: {
      ...companyFilter,
      role: "IT_DEPARTMENT",
      isArchived: false
    },
    include: {
      employee: {
        select: {
          employeeId: true,
          laptopPassword: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  const itPersonnel = rawItPersonnel.map(it => ({
    ...it,
    password: decryptCredential(it.password),
    employee: it.employee ? {
      ...it.employee,
      laptopPassword: decryptCredential(it.employee.laptopPassword)
    } : null
  }));

  // Fetch all staff users for Remote IT Commands & Asset Assignments
  const allStaff = await db.user.findMany({
    where: {
      ...companyFilter,
      isArchived: false
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employee: {
        select: {
          employeeId: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  // Fetch Laptop Assets Inventory
  const rawLaptopAssets = await db.laptopasset.findMany({
    where: {
      ...companyFilter
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          employee: {
            select: {
              employeeId: true
            }
          }
        }
      },
      company: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const laptopAssets = rawLaptopAssets.map(a => ({
    ...a,
    laptopPassword: decryptCredential(a.laptopPassword),
    vpnCredentials: decryptCredential(a.vpnCredentials)
  }));

  // Fetch Anti-Tamper Security Logs
  const tamperLogs = await db.tamperlog.findMany({
    where: {
      ...companyFilter
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          employee: {
            select: {
              employeeId: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  });

  // Fetch active companies
  const companies = await db.company.findMany({
    where: { isArchived: false, status: "APPROVED" },
    select: { id: true, name: true }
  });

  return (
    <DashboardLayout user={{ ...user, companyName }}>
      <div className="dashboard-container" style={{ padding: "2rem" }}>
        <ITManagementDirectory 
          itPersonnel={itPersonnel} 
          allStaff={allStaff}
          laptopAssets={laptopAssets}
          tamperLogs={tamperLogs}
          companies={companies}
          currentUserRole={user.role}
          currentUserCompanyId={user.companyId}
        />
      </div>
    </DashboardLayout>
  );
}
