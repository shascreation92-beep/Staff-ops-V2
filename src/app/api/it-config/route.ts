import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId || "";
  if (!companyId) {
    return NextResponse.json({ cost: 300 }); // Default fallback for system users without company
  }

  try {
    const costRule = await db.rule.findFirst({
      where: { companyId, key: "verification_cost" }
    });
    const cost = costRule ? (parseFloat(costRule.value) || 300) : 300;
    return NextResponse.json({ cost });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch cost" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId || "";
  if (!companyId) {
    return NextResponse.json({ error: "No company context found" }, { status: 400 });
  }

  try {
    const { cost } = await req.json();
    const costValue = parseFloat(cost);
    if (isNaN(costValue) || costValue < 0) {
      return NextResponse.json({ error: "Invalid cost value" }, { status: 400 });
    }

    const costStr = String(costValue);

    const existingRule = await db.rule.findUnique({
      where: {
        key_companyId: { key: "verification_cost", companyId }
      }
    });

    if (existingRule) {
      await db.rule.update({
        where: { id: existingRule.id },
        data: { value: costStr, updatedAt: new Date() }
      });
    } else {
      await db.rule.create({
        data: {
          id: crypto.randomUUID(),
          name: "Verification Cost per Account",
          key: "verification_cost",
          value: costStr,
          companyId,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true, cost: costValue });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update cost" }, { status: 500 });
  }
}
