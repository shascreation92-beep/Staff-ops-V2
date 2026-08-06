"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";

export async function updateUserBioAction(bio: string) {
  const user = await enforceAuth();

  try {
    const cleanBio = sanitizeInput(bio);
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { id: user.id },
          ...(user.email ? [{ email: user.email }] : [])
        ]
      }
    });

    let bioResult = cleanBio.trim();
    if (existingUser) {
      const updated = await db.user.update({
        where: { id: existingUser.id },
        data: { bio: bioResult }
      });
      bioResult = updated.bio || bioResult;
    } else {
      const created = await db.user.create({
        data: {
          id: user.id || crypto.randomUUID(),
          email: user.email || `user_${Date.now()}@worknode.com`,
          name: user.name || "User",
          role: user.role || "SUPER_ADMIN",
          bio: bioResult
        }
      });
      bioResult = created.bio || bioResult;
    }

    revalidatePath("/chat-space");
    return { success: true, bio: bioResult };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update bio." };
  }
}
