import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id || session.user.role !== "SALES_ASSOCIATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const companyId = session.user.companyId || "";

    const [rulesList, dbPlatforms] = await Promise.all([
      db.rule.findMany({ where: { companyId } }),
      db.platform.findMany({ where: { isArchived: false } })
    ]);

    const targetRuleFB = rulesList.find(r => r.key === "targetToMaintainFB");
    const targetRuleGlobal = rulesList.find(r => r.key === "targetToMaintain");
    const fbTarget = targetRuleFB ? (parseInt(targetRuleFB.value, 10) || 40) : (targetRuleGlobal ? (parseInt(targetRuleGlobal.value, 10) || 40) : 40);

    const fbPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("facebook"));
    const vintedPlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("vinted"));
    const gumtreePlatform = dbPlatforms.find(p => p.name.toLowerCase().includes("gumtree"));

    const fbWhere = fbPlatform ? { platformId: fbPlatform.id } : { platform: { name: { contains: "facebook" } } };
    const vintedWhere = vintedPlatform ? { platformId: vintedPlatform.id } : { platform: { name: { contains: "vinted" } } };
    const gumtreeWhere = gumtreePlatform ? { platformId: gumtreePlatform.id } : { platform: { name: { contains: "gumtree" } } };

    const [
      saTotalAccounts,
      fbTotal, fbActive, fbVerified, fbUnverified, fbMarketplace, fbIdentity, fbSuspended,
      vintedTotal, vintedVerified, vintedUnverified, vintedSuspended,
      gumtreeTotal, gumtreeVerified, gumtreeUnverified, gumtreeSuspended
    ] = await Promise.all([
      db.account.count({ where: { createdById: userId, isArchived: false } }),
      db.account.count({ where: { createdById: userId, isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: userId, status: "SORTED", issueType: { notIn: ["Marketplace Issue", "Identity Issue", "Suspended", "Code Issue"] }, isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: userId, verificationStatus: "Yes", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: userId, verificationStatus: "No", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: userId, status: "SORTED", issueType: "Marketplace Issue", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: userId, status: "SORTED", issueType: "Identity Issue", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: userId, status: "SORTED", issueType: "Suspended", isArchived: false, ...fbWhere } }),
      db.account.count({ where: { createdById: userId, isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: userId, verificationStatus: "Yes", isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: userId, verificationStatus: "No", isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: userId, status: "SORTED", issueType: "Suspended", isArchived: false, ...vintedWhere } }),
      db.account.count({ where: { createdById: userId, isArchived: false, ...gumtreeWhere } }),
      db.account.count({ where: { createdById: userId, verificationStatus: "Yes", isArchived: false, ...gumtreeWhere } }),
      db.account.count({ where: { createdById: userId, verificationStatus: "No", isArchived: false, ...gumtreeWhere } }),
      db.account.count({ where: { createdById: userId, status: "SORTED", issueType: "Suspended", isArchived: false, ...gumtreeWhere } }),
    ]);

    return NextResponse.json({
      saTotalAccounts,
      fbTotal,
      fbActive,
      fbVerified,
      fbUnverified,
      fbMarketplace,
      fbIdentity,
      fbSuspended,
      fbTarget,
      vintedTotal,
      vintedVerified,
      vintedUnverified,
      vintedSuspended,
      gumtreeTotal,
      gumtreeVerified,
      gumtreeUnverified,
      gumtreeSuspended
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load dashboard metrics" }, { status: 500 });
  }
}
