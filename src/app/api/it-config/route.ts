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
    return NextResponse.json({ facebookCost: 300, vintedCost: 300 });
  }

  try {
    const rules = await db.rule.findMany({
      where: {
        companyId,
        key: { in: ["facebook_verification_cost", "vinted_verification_cost", "verification_cost"] }
      }
    });

    const facebookCostRule = rules.find(r => r.key === "facebook_verification_cost");
    const vintedCostRule = rules.find(r => r.key === "vinted_verification_cost");
    const fallbackCostRule = rules.find(r => r.key === "verification_cost");

    const facebookCost = facebookCostRule 
      ? (parseFloat(facebookCostRule.value) || 300) 
      : fallbackCostRule 
        ? (parseFloat(fallbackCostRule.value) || 300) 
        : 300;

    const vintedCost = vintedCostRule 
      ? (parseFloat(vintedCostRule.value) || 300) 
      : 300;

    return NextResponse.json({ facebookCost, vintedCost });
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
    const body = await req.json();
    
    if (body.facebookCost !== undefined) {
      const fbVal = parseFloat(body.facebookCost);
      if (isNaN(fbVal) || fbVal < 0) {
        return NextResponse.json({ error: "Invalid Facebook cost value" }, { status: 400 });
      }
      const fbStr = String(fbVal);
      const existingFbRule = await db.rule.findUnique({
        where: { key_companyId: { key: "facebook_verification_cost", companyId } }
      });
      if (existingFbRule) {
        await db.rule.update({
          where: { id: existingFbRule.id },
          data: { value: fbStr, updatedAt: new Date() }
        });
      } else {
        await db.rule.create({
          data: {
            id: crypto.randomUUID(),
            name: "Facebook Verification Cost",
            key: "facebook_verification_cost",
            value: fbStr,
            companyId,
            updatedAt: new Date()
          }
        });
      }
    }

    if (body.vintedCost !== undefined) {
      const vintedVal = parseFloat(body.vintedCost);
      if (isNaN(vintedVal) || vintedVal < 0) {
        return NextResponse.json({ error: "Invalid Vinted cost value" }, { status: 400 });
      }
      const vintedStr = String(vintedVal);
      const existingVintedRule = await db.rule.findUnique({
        where: { key_companyId: { key: "vinted_verification_cost", companyId } }
      });
      if (existingVintedRule) {
        await db.rule.update({
          where: { id: existingVintedRule.id },
          data: { value: vintedStr, updatedAt: new Date() }
        });
      } else {
        await db.rule.create({
          data: {
            id: crypto.randomUUID(),
            name: "Vinted Verification Cost",
            key: "vinted_verification_cost",
            value: vintedStr,
            companyId,
            updatedAt: new Date()
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update cost" }, { status: 500 });
  }
}
