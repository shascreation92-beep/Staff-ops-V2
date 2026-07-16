"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function updateUserBioAction(bio: string) {
  const user = await enforceAuth();

  try {
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { bio: bio.trim() }
    });

    revalidatePath("/chat-space");
    return { success: true, bio: updatedUser.bio };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update bio.");
  }
}
