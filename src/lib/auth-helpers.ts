import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { user_role, user_status } from "@prisma/client";

// Get server session helper
export async function getServerAuthSession() {
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

  return session.user;
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
import { db } from "./db";
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
