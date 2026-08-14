"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth, logAction } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { hashPassword, sanitizeInput } from "@/lib/security";
import { z } from "zod";

const CreateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Valid owner email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const UpdateCompanySchema = z.object({
  id: z.string().min(1, "Company ID is required"),
  name: z.string().min(1, "Company name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Valid owner email is required"),
  password: z.string().optional(),
});

export async function getCompaniesAction() {
  await enforceAuth(["SUPER_ADMIN"]);

  try {
    const companies = await db.company.findMany({
      where: { isArchived: false },
      include: {
        user: {
          where: { role: "COMPANY_OWNER", isArchived: false },
          select: { id: true, name: true, email: true, status: true, createdAt: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, companies };
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return { success: false, error: error.message || "Failed to fetch companies", companies: [] };
  }
}

export async function createCompanyAction(formData: z.infer<typeof CreateCompanySchema>) {
  const user = await enforceAuth(["SUPER_ADMIN"]);

  const result = CreateCompanySchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map((e) => e.message).join(", "));
  }

  // Sanitize user input strings
  const name = sanitizeInput(result.data.name);
  const ownerName = sanitizeInput(result.data.ownerName);
  const ownerEmail = sanitizeInput(result.data.ownerEmail).toLowerCase();
  const rawPassword = result.data.password;

  // Check if owner email is already in use
  const existingUser = await db.user.findUnique({
    where: { email: ownerEmail },
  });

  if (existingUser) {
    throw new Error(`A user account with email "${ownerEmail}" already exists.`);
  }

  // Check if company name already exists
  const existingCompany = await db.company.findFirst({
    where: { name, isArchived: false },
  });

  if (existingCompany) {
    throw new Error(`A company with name "${name}" already exists.`);
  }

  try {
    const companyId = crypto.randomUUID();
    const now = new Date();

    // 1. Create Company record
    const company = await db.company.create({
      data: {
        id: companyId,
        name: name,
        ownerName: ownerName,
        ownerEmail: ownerEmail,
        status: "APPROVED",
        updatedAt: now,
      },
    });

    // 2. Securely hash password using bcryptjs
    const hashedPassword = await hashPassword(rawPassword);

    // 3. Create Company Owner user account with hashed password
    const ownerUserId = crypto.randomUUID();
    const ownerUser = await db.user.create({
      data: {
        id: ownerUserId,
        email: ownerEmail,
        name: ownerName,
        password: hashedPassword,
        role: "COMPANY_OWNER",
        status: "APPROVED",
        companyId: companyId,
        updatedAt: now,
      },
    });

    // 4. Write audit log entry
    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "CREATE",
      entity: "company",
      entityId: companyId,
      newValue: `Created company "${name}" with owner "${ownerName}" (${ownerEmail})`,
    });

    revalidatePath("/companies");
    revalidatePath("/settings");
    revalidatePath("/accounts");
    revalidatePath("/");

    return {
      success: true,
      companyId: company.id,
      ownerId: ownerUser.id,
      companyName: company.name,
      ownerEmail: ownerEmail,
      ownerName: ownerName,
      password: rawPassword,
    };
  } catch (error: any) {
    console.error("Error creating company:", error);
    throw new Error(error.message || "Failed to create company.");
  }
}

export async function updateCompanyAction(formData: z.infer<typeof UpdateCompanySchema>) {
  const user = await enforceAuth(["SUPER_ADMIN"]);

  const result = UpdateCompanySchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map((e) => e.message).join(", "));
  }

  const id = sanitizeInput(result.data.id);
  const name = sanitizeInput(result.data.name);
  const ownerName = sanitizeInput(result.data.ownerName);
  const ownerEmail = sanitizeInput(result.data.ownerEmail).toLowerCase();
  const rawPassword = result.data.password;

  const targetCompany = await db.company.findUnique({
    where: { id },
    include: {
      user: {
        where: { role: "COMPANY_OWNER", isArchived: false }
      }
    }
  });

  if (!targetCompany) {
    throw new Error("Company not found.");
  }

  try {
    const now = new Date();

    // 1. Update company record
    await db.company.update({
      where: { id },
      data: {
        name,
        ownerName,
        ownerEmail,
        updatedAt: now
      }
    });

    // 2. Update company owner user if present
    const ownerUser = targetCompany.user[0];
    if (ownerUser) {
      const hashedPassword = rawPassword ? await hashPassword(rawPassword) : undefined;
      await db.user.update({
        where: { id: ownerUser.id },
        data: {
          name: ownerName,
          email: ownerEmail,
          ...(hashedPassword ? { password: hashedPassword } : {}),
          updatedAt: now
        }
      });
    }

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "UPDATE",
      entity: "company",
      entityId: id,
      newValue: `Updated company "${name}" owner details (${ownerEmail})`
    });

    revalidatePath("/companies");
    revalidatePath("/settings");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating company:", error);
    throw new Error(error.message || "Failed to update company.");
  }
}

export async function archiveCompanyAction(companyId: string) {
  const user = await enforceAuth(["SUPER_ADMIN"]);
  const cleanCompanyId = sanitizeInput(companyId);

  try {
    const now = new Date();

    await db.company.update({
      where: { id: cleanCompanyId },
      data: {
        isArchived: true,
        archivedAt: now,
        archivedBy: user.email || "",
        updatedAt: now
      }
    });

    await logAction({
      userId: user.id,
      userEmail: user.email || "",
      userRole: user.role,
      action: "ARCHIVE",
      entity: "company",
      entityId: cleanCompanyId
    });

    revalidatePath("/companies");
    revalidatePath("/settings");

    return { success: true };
  } catch (error: any) {
    console.error("Error archiving company:", error);
    throw new Error(error.message || "Failed to archive company.");
  }
}
