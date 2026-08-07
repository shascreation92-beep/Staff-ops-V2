import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerAuthSession } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized access. Please sign in." }, { status: 401 });
    }
    const currentUser = session.user;
    const { searchParams } = new URL(req.url);

    const userId = searchParams.get("userId");
    const dateStr = searchParams.get("dateStr") || new Date().toISOString().split("T")[0];

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required." }, { status: 400 });
    }

    // Verify target user belongs to company
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, companyId: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (currentUser.role !== "SUPER_ADMIN" && targetUser.companyId !== currentUser.companyId) {
      return NextResponse.json({ error: "Unauthorized access to user snapshots." }, { status: 403 });
    }

    const isAll7Days = searchParams.get("all7days") === "true";

    let whereClause: any = { userId };
    if (isAll7Days) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      whereClause.capturedAt = { gte: sevenDaysAgo };
    } else {
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
      whereClause.capturedAt = { gte: startOfDay, lte: endOfDay };
    }

    const snapshots = await db.screensnapshot.findMany({
      where: whereClause,
      orderBy: {
        capturedAt: "asc"
      }
    });

    if (snapshots.length === 0) {
      return NextResponse.json({ error: "No screenshots found for this user on selected date." }, { status: 404 });
    }

    const zip = new JSZip();
    const folderName = `${targetUser.name || targetUser.email.split("@")[0]}_${dateStr}`;
    const imgFolder = zip.folder(folderName);

    let addedCount = 0;
    for (const snap of snapshots) {
      if (snap.imageUrl) {
        const relativeUrl = snap.imageUrl.startsWith("/") ? snap.imageUrl.slice(1) : snap.imageUrl;
        const filePath = path.join(process.cwd(), "public", relativeUrl);

        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath);
          const dateFolderStr = new Date(snap.capturedAt).toISOString().split("T")[0];
          const timeStr = new Date(snap.capturedAt).toISOString().split("T")[1].replace(/:/g, "-").split(".")[0];
          const fileName = `${dateFolderStr}/snap_${timeStr}_${snap.isIdle ? "IDLE" : "ACTIVE"}.webp`;
          imgFolder?.file(fileName, fileData);
          addedCount++;
        }
      }
    }

    if (addedCount === 0) {
      return NextResponse.json({ error: "Screenshot files missing on server." }, { status: 404 });
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const cleanUserName = (targetUser.name || targetUser.email.split("@")[0]).replace(/[^a-zA-Z0-9_-]/g, "_");
    const zipFilename = isAll7Days ? `Screenshots_${cleanUserName}_FULL_7DAY_BACKUP.zip` : `Screenshots_${cleanUserName}_${dateStr}.zip`;

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipBuffer.length.toString()
      }
    });
  } catch (error: any) {
    console.error("API /api/telemetry/download-zip error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate screenshot ZIP archive." }, { status: 500 });
  }
}
