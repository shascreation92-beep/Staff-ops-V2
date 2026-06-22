"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { z } from "zod";

const SendMessageSchema = z.object({
  receiverId: z.string().min(1, "Recipient is required"),
  message: z.string().min(1, "Message cannot be empty")
});

export async function sendChatMessageAction(formData: z.infer<typeof SendMessageSchema>) {
  const user = await enforceAuth();

  const result = SendMessageSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { receiverId, message } = result.data;

  // Verify recipient exists
  const receiver = await db.user.findUnique({
    where: { id: receiverId }
  });

  if (!receiver) {
    throw new Error("Recipient not found.");
  }

  // Multi-tenant check: Company members can only chat with colleagues of the same company OR Super Admin
  if (user.role !== "SUPER_ADMIN" && receiver.role !== "SUPER_ADMIN" && receiver.companyId !== user.companyId) {
    throw new Error("UNAUTHORIZED: You can only communicate with users of your company.");
  }

  try {
    const newMessage = await db.chatmessage.create({
      data: {
        id: crypto.randomUUID(),
        senderId: user.id,
        receiverId,
        message,
        isRead: false,
        createdAt: new Date()
      }
    });

    revalidatePath("/chat");
    return { success: true, message: newMessage };
  } catch (error: any) {
    throw new Error(error.message || "Failed to transmit message.");
  }
}
