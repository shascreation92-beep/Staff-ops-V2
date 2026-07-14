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

    revalidatePath("/chat-space");
    return { success: true, message: newMessage };
  } catch (error: any) {
    throw new Error(error.message || "Failed to transmit message.");
  }
}

export async function createChatGroupAction(formData: { name: string; isPrivate: boolean; initialMembers: string[] }) {
  const user = await enforceAuth();
  
  if (!formData.name) {
    throw new Error("Group name is required.");
  }
  
  const companyId = user.companyId;
  if (!companyId) {
    throw new Error("You must belong to a company to create groups.");
  }

  const groupId = crypto.randomUUID();

  const newGroup = await db.chatgroup.create({
    data: {
      id: groupId,
      name: formData.name,
      isPrivate: formData.isPrivate,
      companyId: companyId,
      createdById: user.id
    }
  });

  await db.chatgroupmember.create({
    data: {
      id: crypto.randomUUID(),
      groupId: groupId,
      userId: user.id
    }
  });

  if (formData.initialMembers && formData.initialMembers.length > 0) {
    const validMembers = await db.user.findMany({
      where: {
        id: { in: formData.initialMembers },
        companyId: companyId,
        isArchived: false
      },
      select: { id: true }
    });

    for (const member of validMembers) {
      if (member.id !== user.id) {
        await db.chatgroupmember.create({
          data: {
            id: crypto.randomUUID(),
            groupId: groupId,
            userId: member.id
          }
        });
      }
    }
  }

  revalidatePath("/chat-space");
  return { success: true, groupId };
}

export async function togglePinChatAction(targetId: string, isGroup: boolean) {
  const user = await enforceAuth();

  const existingPin = await db.chatpin.findUnique({
    where: {
      userId_targetId: {
        userId: user.id,
        targetId: targetId
      }
    }
  });

  if (existingPin) {
    await db.chatpin.delete({
      where: {
        userId_targetId: {
          userId: user.id,
          targetId: targetId
        }
      }
    });
    revalidatePath("/chat-space");
    return { success: true, pinned: false };
  } else {
    await db.chatpin.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        targetId: targetId,
        isGroup: isGroup
      }
    });
    revalidatePath("/chat-space");
    return { success: true, pinned: true };
  }
}

export async function joinPublicGroupAction(groupId: string) {
  const user = await enforceAuth();

  const group = await db.chatgroup.findUnique({
    where: {
      id: groupId,
      companyId: user.companyId || ""
    }
  });

  if (!group) {
    throw new Error("Group not found.");
  }

  if (group.isPrivate) {
    throw new Error("Cannot join a private space without invitation.");
  }

  const existingMember = await db.chatgroupmember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id
      }
    }
  });

  if (!existingMember) {
    await db.chatgroupmember.create({
      data: {
        id: crypto.randomUUID(),
        groupId: groupId,
        userId: user.id
      }
    });
  }

  revalidatePath("/chat-space");
  return { success: true };
}

export async function sendGroupMessageAction(groupId: string, message: string) {
  const user = await enforceAuth();

  if (!message || message.trim() === "") {
    throw new Error("Message cannot be empty.");
  }

  const membership = await db.chatgroupmember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id
      }
    }
  });

  if (!membership) {
    throw new Error("You are not a member of this group.");
  }

  try {
    const newMessage = await db.chatgroupmessage.create({
      data: {
        id: crypto.randomUUID(),
        groupId,
        senderId: user.id,
        message,
        createdAt: new Date()
      }
    });

    revalidatePath("/chat-space");
    return { success: true, message: newMessage };
  } catch (error: any) {
    throw new Error(error.message || "Failed to transmit group message.");
  }
}

