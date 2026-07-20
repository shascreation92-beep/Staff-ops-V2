"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";

export async function updateUserBioAction(bio: string) {
  const user = await enforceAuth();

  try {
    const cleanBio = sanitizeInput(bio);
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { bio: cleanBio.trim() }
    });

    revalidatePath("/chat-space");
    return { success: true, bio: updatedUser.bio };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update bio." };
  }
}
