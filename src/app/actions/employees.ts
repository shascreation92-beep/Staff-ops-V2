"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth, getCompanyFilter, logAction } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { 
  employee_laptopBrand, 
  employee_windowsVersion, 
  employee_vpnProvider, 
  user_role 
} from "@prisma/client";
import { z } from "zod";

const CreateEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  fullName: z.string().min(1, "Full Name is required"),
  email: z.string().email("Invalid email format"),
  status: z.string().default("ACTIVE"),
  targetCompanyId: z.string().optional(),
  laptopBrand: z.nativeEnum(employee_laptopBrand).nullable().optional(),
  laptopModel: z.string().nullable().optional(),
  laptopSerialNumber: z.string().nullable().optional(),
  windowsVersion: z.nativeEnum(employee_windowsVersion).nullable().optional(),
  vpnProvider: z.nativeEnum(employee_vpnProvider).nullable().optional(),
  laptopPassword: z.string().nullable().optional(),
  vpnCredentials: z.string().nullable().optional(),
});

export async function createEmployeeAction(formData: z.infer<typeof CreateEmployeeSchema>) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER"]);

  const result = CreateEmployeeSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { employeeId, fullName, email, status, targetCompanyId } = result.data;

  // Determine Company ID
  let companyId = user.companyId;
  if (user.role === "SUPER_ADMIN") {
    if (!targetCompanyId) {
      throw new Error("Target company ID is required for Super Admin.");
    }
    companyId = targetCompanyId;
  }

  if (!companyId) {
    throw new Error("No company context found.");
  }

  // Check unique email and employeeId
  const existingEmail = await db.employee.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw new Error("An employee with this email already exists.");
  }

  const existingId = await db.employee.findUnique({
    where: { employeeId },
  });
  if (existingId) {
    throw new Error(`Employee ID "${employeeId}" is already in use.`);
  }

  try {
    const newEmp = await db.employee.create({
      data: {
        id: crypto.randomUUID(),
        employeeId,
        fullName,
        email,
        status,
        companyId,
        laptopBrand: result.data.laptopBrand || null,
        laptopModel: result.data.laptopModel || null,
        laptopSerialNumber: result.data.laptopSerialNumber || null,
        windowsVersion: result.data.windowsVersion || null,
        vpnProvider: result.data.vpnProvider || null,
        laptopPassword: result.data.laptopPassword || null,
        vpnCredentials: result.data.vpnCredentials || null,
        updatedAt: new Date()
      }
    });

    // Write audit log
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "CREATE",
      entity: "employee",
      entityId: newEmp.id,
      newValue: JSON.stringify(newEmp)
    });

    revalidatePath("/employees");
    return { success: true, employee: newEmp };
  } catch (error: any) {
    throw new Error(error.message || "Failed to create employee.");
  }
}

const UpdateEmployeeITSchema = z.object({
  laptopBrand: z.nativeEnum(employee_laptopBrand).nullable(),
  laptopModel: z.string().nullable(),
  laptopSerialNumber: z.string().nullable(),
  windowsVersion: z.nativeEnum(employee_windowsVersion).nullable(),
  vpnProvider: z.nativeEnum(employee_vpnProvider).nullable(),
  laptopPassword: z.string().nullable(),
  vpnCredentials: z.string().nullable(),
});

export async function updateEmployeeITAction(
  id: string, 
  formData: z.infer<typeof UpdateEmployeeITSchema>
) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"]);

  const result = UpdateEmployeeITSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const emp = await db.employee.findUnique({
    where: { id },
  });

  if (!emp) {
    throw new Error("Employee not found.");
  }

  // Multi-tenant check
  if (user.role !== "SUPER_ADMIN" && emp.companyId !== user.companyId) {
    throw new Error("UNAUTHORIZED: Access to another company's records is forbidden.");
  }

  try {
    const oldVal = JSON.stringify(emp);

    const updatedEmp = await db.employee.update({
      where: { id },
      data: {
        ...result.data,
        updatedAt: new Date()
      }
    });

    // Write audit log
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "IT_UPDATE",
      entity: "employee",
      entityId: id,
      oldValue: oldVal,
      newValue: JSON.stringify(updatedEmp)
    });

    revalidatePath("/employees");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update IT specs.");
  }
}

export async function archiveEmployeeAction(id: string) {
  const user = await enforceAuth(["SUPER_ADMIN", "COMPANY_OWNER", "TEAM_LEAD"]);

  const emp = await db.employee.findUnique({
    where: { id }
  });

  if (!emp) {
    throw new Error("Employee not found.");
  }

  if (user.role !== "SUPER_ADMIN" && emp.companyId !== user.companyId) {
    throw new Error("UNAUTHORIZED");
  }

  try {
    await db.employee.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: user.email || "unknown@worknode.com",
        status: "ARCHIVED",
        updatedAt: new Date()
      }
    });

    // Write audit log
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "ARCHIVE",
      entity: "employee",
      entityId: id
    });

    revalidatePath("/employees");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to archive employee.");
  }
}

export async function saveAssociateEmployeeITAction(
  userId: string,
  formData: {
    employeeId?: string;
    laptopBrand?: employee_laptopBrand | null;
    laptopModel?: string | null;
    laptopSerialNumber?: string | null;
    windowsVersion?: employee_windowsVersion | null;
    vpnProvider?: employee_vpnProvider | null;
    laptopPassword?: string | null;
    vpnCredentials?: string | null;
  }
) {
  const user = await enforceAuth(["TEAM_LEAD", "SUPER_ADMIN", "COMPANY_OWNER"]);
  
  const targetUser = await db.user.findUnique({
    where: { id: userId },
    include: { employee: true }
  });

  if (!targetUser) {
    throw new Error("Associate not found.");
  }

  if (user.role !== "SUPER_ADMIN" && targetUser.companyId !== user.companyId) {
    throw new Error("UNAUTHORIZED");
  }

  let employeeId = formData.employeeId;
  if (!employeeId) {
    if (targetUser.employee?.employeeId) {
      employeeId = targetUser.employee.employeeId;
    } else {
      employeeId = `EMP-${targetUser.name?.replace(/\s+/g, "").toUpperCase() || targetUser.id.substring(0, 5)}`;
    }
  }

  try {
    const updated = await db.employee.upsert({
      where: { userId },
      update: {
        laptopBrand: formData.laptopBrand || null,
        laptopModel: formData.laptopModel || null,
        laptopSerialNumber: formData.laptopSerialNumber || null,
        windowsVersion: formData.windowsVersion || null,
        vpnProvider: formData.vpnProvider || null,
        laptopPassword: formData.laptopPassword || null,
        vpnCredentials: formData.vpnCredentials || null,
        updatedAt: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        employeeId,
        fullName: targetUser.name || "Sales Representative",
        email: targetUser.email,
        userId: targetUser.id,
        companyId: targetUser.companyId!,
        laptopBrand: formData.laptopBrand || null,
        laptopModel: formData.laptopModel || null,
        laptopSerialNumber: formData.laptopSerialNumber || null,
        windowsVersion: formData.windowsVersion || null,
        vpnProvider: formData.vpnProvider || null,
        laptopPassword: formData.laptopPassword || null,
        vpnCredentials: formData.vpnCredentials || null,
        updatedAt: new Date()
      }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "IT_UPSERT",
      entity: "employee",
      entityId: updated.id,
      newValue: JSON.stringify(updated)
    });

    revalidatePath("/my-team");
    return { success: true, employee: updated };
  } catch (error: any) {
    throw new Error(error.message || "Failed to save IT specs.");
  }
}
