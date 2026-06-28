import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { user_role, user_status } from "@prisma/client";
import { db } from "./db";

// Get server session helper
export async function getServerAuthSession() {
  if (process.env.MOCK_USER_ROLE) {
    return {
      user: {
        id: process.env.MOCK_USER_ID,
        email: process.env.MOCK_USER_EMAIL,
        role: process.env.MOCK_USER_ROLE,
        status: "APPROVED",
        companyId: "demo-company-id"
      }
    } as any;
  }
  return await getServerSession(authOptions);
}

// Enforce authentication, role checking and status approval
export async function enforceAuth(allowedRoles?: user_role[]) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Enforce account approval check
  if (session.user.status === "PENDING") {
    redirect("/pending");
  }

  if (session.user.status === "BLOCKED" || session.user.status === "REJECTED") {
    redirect(`/auth/signin?error=Callback`);
  }

  // Enforce role-based access control (RBAC)
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new Error("UNAUTHORIZED: Insufficient permissions for this operation.");
  }

  // Fetch Team Lead's name dynamically if role is SALES_ASSOCIATE
  let teamLeadName: string | null = null;
  if (session.user.role === "SALES_ASSOCIATE") {
    try {
      const dbUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          user: {
            select: { name: true }
          }
        }
      });
      if (dbUser?.user) {
        teamLeadName = dbUser.user.name;
      }
    } catch (err) {
      console.error("Failed to fetch dynamic team lead name in enforceAuth:", err);
    }
  }

  return {
    ...session.user,
    teamLeadName
  };
}

// Generate companyId filter for multi-tenant isolation
export function getCompanyFilter(user: { role: user_role; companyId?: string | null }) {
  if (user.role === "SUPER_ADMIN") {
    // Super Admins bypass multi-tenant isolation
    return {};
  }
  
  if (!user.companyId) {
    throw new Error("UNAUTHORIZED: User is not associated with any company.");
  }

  return { companyId: user.companyId };
}

// Audit logging helper
export async function logAction({
  userId,
  userEmail,
  userRole,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
  ipAddress = "127.0.0.1",
  country = "US"
}: {
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  country?: string;
}) {
  try {
    await db.auditlog.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        userEmail,
        userRole,
        action,
        entity,
        entityId,
        oldValue,
        newValue,
        ipAddress,
        country,
      }
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
