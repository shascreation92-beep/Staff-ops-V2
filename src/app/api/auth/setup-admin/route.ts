import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let company = await db.company.findFirst({
      where: { isArchived: false }
    });

    if (!company) {
      company = await db.company.create({
        data: {
          id: "acme-corp-id",
          name: "Acme Corp",
          status: "APPROVED",
          updatedAt: new Date()
        }
      });
    }

    const hashedPassword = await bcrypt.hash("Cupoftea@9090", 12);
    const email = "faizancheena9@gmail.com";

    const user = await db.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: "SUPER_ADMIN",
        status: "APPROVED",
        companyId: company.id,
        isArchived: false,
        updatedAt: new Date()
      },
      create: {
        id: "superadmin-faizan",
        email,
        name: "Super Admin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        status: "APPROVED",
        companyId: company.id,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: "🎉 Super Admin Account Activated Successfully!",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      },
      credentials: {
        email: "faizancheena9@gmail.com",
        password: "Cupoftea@9090"
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to set up Super Admin"
    }, { status: 500 });
  }
}
