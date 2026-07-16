import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Limit to 50MB
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "File size exceeds the 50MB limit." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create attachments upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "attachments");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Sanitize filename to prevent directory traversal or invalid characters
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `/uploads/attachments/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to process file upload." }, { status: 500 });
  }
}
