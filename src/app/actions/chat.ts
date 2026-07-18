"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { z } from "zod";

const SendMessageSchema = z.object({
  receiverId: z.string().min(1, "Recipient is required"),
  message: z.string().min(1, "Message cannot be empty"),
  replyToId: z.string().optional().nullable(),
  replyToSenderId: z.string().optional().nullable(),
  replyToSenderName: z.string().optional().nullable(),
  replyToMessage: z.string().optional().nullable()
});

export async function sendChatMessageAction(formData: z.infer<typeof SendMessageSchema>) {
  const user = await enforceAuth();

  const result = SendMessageSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "));
  }

  const { receiverId, message, replyToId, replyToSenderId, replyToSenderName, replyToMessage } = result.data;

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
        createdAt: new Date(),
        replyToId,
        replyToSenderId,
        replyToSenderName,
        replyToMessage
      }
    });

    // Create a database notification record for direct message delivery
    await db.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: receiverId,
        title: `💬 Message from ${user.name || "Colleague"}`,
        message: `[CHAT_ID:${user.id}] ${message.startsWith("📎 ATTACHMENT") ? "Sent you an attachment file" : message.length > 80 ? message.slice(0, 80) + "..." : message}`,
        type: "CHAT_DIRECT",
        isRead: false,
        isArchived: false,
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

    // Create system join message
    await db.chatgroupmessage.create({
      data: {
        id: crypto.randomUUID(),
        groupId: groupId,
        senderId: user.id,
        message: `📢 SYSTEM: ${user.name || "Colleague"} joined the channel`,
        createdAt: new Date()
      }
    });
  }

  revalidatePath("/chat-space");
  return { success: true };
}

export async function requestJoinGroupAction(groupId: string) {
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

  // Check membership
  const existingMember = await db.chatgroupmember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id
      }
    }
  });
  if (existingMember) {
    throw new Error("You are already a member of this group.");
  }

  // Check existing request
  const existingReq = await db.chatjoinrequest.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id
      }
    }
  });

  if (!existingReq) {
    await db.chatjoinrequest.create({
      data: {
        id: crypto.randomUUID(),
        groupId,
        userId: user.id,
        status: "PENDING"
      }
    });
  }

  revalidatePath("/chat-space");
  return { success: true, status: "PENDING" };
}

export async function approveJoinRequestAction(requestId: string) {
  const user = await enforceAuth();

  const req = await db.chatjoinrequest.findUnique({
    where: { id: requestId },
    include: { group: true, user: true }
  });

  if (!req) {
    throw new Error("Join request not found.");
  }

  // Verify that the current user is the group creator
  if (req.group.createdById !== user.id) {
    throw new Error("UNAUTHORIZED: Only the group creator can approve join requests.");
  }

  // Create membership inside a transaction
  await db.$transaction([
    db.chatgroupmember.create({
      data: {
        id: crypto.randomUUID(),
        groupId: req.groupId,
        userId: req.userId
      }
    }),
    db.chatgroupmessage.create({
      data: {
        id: crypto.randomUUID(),
        groupId: req.groupId,
        senderId: req.userId,
        message: `📢 SYSTEM: ${req.user.name || "Colleague"} joined the channel`,
        createdAt: new Date()
      }
    }),
    db.chatjoinrequest.delete({
      where: { id: requestId }
    })
  ]);

  revalidatePath("/chat-space");
  return { success: true };
}

export async function rejectJoinRequestAction(requestId: string) {
  const user = await enforceAuth();

  const req = await db.chatjoinrequest.findUnique({
    where: { id: requestId },
    include: { group: true }
  });

  if (!req) {
    throw new Error("Join request not found.");
  }

  // Verify that the current user is the group creator
  if (req.group.createdById !== user.id) {
    throw new Error("UNAUTHORIZED: Only the group creator can reject join requests.");
  }

  await db.chatjoinrequest.delete({
    where: { id: requestId }
  });

  revalidatePath("/chat-space");
  return { success: true };
}

export async function sendGroupMessageAction(
  groupId: string,
  message: string,
  replyToId?: string | null,
  replyToSenderId?: string | null,
  replyToSenderName?: string | null,
  replyToMessage?: string | null
) {
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
        createdAt: new Date(),
        replyToId,
        replyToSenderId,
        replyToSenderName,
        replyToMessage
      }
    });

    // Scan and notify mentioned group members via persistent database alerts
    const group = await db.chatgroup.findUnique({
      where: { id: groupId }
    });

    const members = await db.chatgroupmember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const checkUserIsMentioned = (msgText: string, uName: string) => {
      if (!msgText || !uName) return false;
      if (msgText.toLowerCase().includes("@all") || msgText.toLowerCase().includes("@everyone")) {
        return true;
      }
      const escapedFullName = uName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const fullNameRegex = new RegExp(`@${escapedFullName}\\b`, 'i');
      if (fullNameRegex.test(msgText)) return true;

      const nameParts = uName.trim().split(/\s+/);
      if (nameParts.length > 1) {
        const firstName = nameParts[0];
        const escapedFirstName = firstName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const firstNameRegex = new RegExp(`@${escapedFirstName}\\b`, 'i');
        if (firstNameRegex.test(msgText)) return true;
      }
      return false;
    };

    for (const member of members) {
      if (member.userId === user.id) continue;
      if (checkUserIsMentioned(message, member.user.name || "")) {
        await db.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: member.userId,
            title: `💬 Mentioned in #${group?.name || "Group"}`,
            message: `[CHAT_ID:${groupId}] ${user.name || "A colleague"} mentioned you: "${message.length > 60 ? message.slice(0, 60) + "..." : message}"`,
            type: "CHAT_MENTION",
            isRead: false,
            isArchived: false,
            createdAt: new Date()
          }
        });
      }
    }

    revalidatePath("/chat-space");
    return { success: true, message: newMessage };
  } catch (error: any) {
    throw new Error(error.message || "Failed to transmit group message.");
  }
}

export async function editChatMessageAction(messageId: string, isGroup: boolean, newMessageContent: string) {
  const user = await enforceAuth();
  
  if (isGroup) {
    const msg = await db.chatgroupmessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new Error("Message not found.");
    if (msg.senderId !== user.id) throw new Error("UNAUTHORIZED: You can only edit your own messages.");
    
    await db.chatgroupmessage.update({
      where: { id: messageId },
      data: {
        message: newMessageContent,
        isEdited: true,
        editedAt: new Date()
      }
    });
  } else {
    const msg = await db.chatmessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new Error("Message not found.");
    if (msg.senderId !== user.id) throw new Error("UNAUTHORIZED: You can only edit your own messages.");

    await db.chatmessage.update({
      where: { id: messageId },
      data: {
        message: newMessageContent,
        isEdited: true,
        editedAt: new Date()
      }
    });
  }
  revalidatePath("/chat-space");
  return { success: true };
}

export async function deleteChatMessageAction(messageId: string, isGroup: boolean) {
  const user = await enforceAuth();
  
  if (isGroup) {
    const msg = await db.chatgroupmessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new Error("Message not found.");
    if (msg.senderId !== user.id) throw new Error("UNAUTHORIZED: You can only delete your own messages.");

    await db.chatgroupmessage.update({
      where: { id: messageId },
      data: {
        message: "🚫 This message was deleted",
        isDeleted: true
      }
    });
  } else {
    const msg = await db.chatmessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new Error("Message not found.");
    if (msg.senderId !== user.id) throw new Error("UNAUTHORIZED: You can only delete your own messages.");

    await db.chatmessage.update({
      where: { id: messageId },
      data: {
        message: "🚫 This message was deleted",
        isDeleted: true
      }
    });
  }
  revalidatePath("/chat-space");
  return { success: true };
}

export async function toggleStarMessageAction(messageId: string, isGroup: boolean) {
  const user = await enforceAuth();
  
  const existing = await db.chatstar.findFirst({
    where: {
      userId: user.id,
      messageId: isGroup ? null : messageId,
      groupMessageId: isGroup ? messageId : null
    }
  });

  if (existing) {
    await db.chatstar.delete({
      where: { id: existing.id }
    });
    return { success: true, starred: false };
  } else {
    await db.chatstar.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        messageId: isGroup ? null : messageId,
        groupMessageId: isGroup ? messageId : null
      }
    });
    return { success: true, starred: true };
  }
}

export async function getStarredMessagesAction() {
  const user = await enforceAuth();
  const stars = await db.chatstar.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  const starredItems = [];
  for (const star of stars) {
    if (star.messageId) {
      const msg = await db.chatmessage.findUnique({
        where: { id: star.messageId },
        include: {
          user_chatmessage_senderIdTouser: { select: { name: true } }
        }
      });
      if (msg) starredItems.push({ ...msg, isGroup: false, senderName: msg.user_chatmessage_senderIdTouser.name });
    } else if (star.groupMessageId) {
      const msg = await db.chatgroupmessage.findUnique({
        where: { id: star.groupMessageId },
        include: {
          sender: { select: { name: true } }
        }
      });
      if (msg) starredItems.push({ ...msg, isGroup: true, senderName: msg.sender.name });
    }
  }
  return starredItems;
}

export async function toggleEmojiReactionAction(messageId: string, isGroup: boolean, emoji: string) {
  const user = await enforceAuth();

  let currentReactionsStr: string | null = null;
  if (isGroup) {
    const msg = await db.chatgroupmessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new Error("Message not found.");
    currentReactionsStr = msg.reactions;
  } else {
    const msg = await db.chatmessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new Error("Message not found.");
    currentReactionsStr = msg.reactions;
  }

  let reactions: Array<{ emoji: string; userIds: string[] }> = [];
  if (currentReactionsStr) {
    try {
      reactions = JSON.parse(currentReactionsStr);
    } catch (e) {
      reactions = [];
    }
  }

  const existingEmojiIndex = reactions.findIndex(r => r.emoji === emoji);
  if (existingEmojiIndex !== -1) {
    const r = reactions[existingEmojiIndex];
    if (r.userIds.includes(user.id)) {
      r.userIds = r.userIds.filter(id => id !== user.id);
    } else {
      r.userIds.push(user.id);
    }
    if (r.userIds.length === 0) {
      reactions.splice(existingEmojiIndex, 1);
    }
  } else {
    reactions.push({ emoji, userIds: [user.id] });
  }

  const updatedReactionsStr = JSON.stringify(reactions);

  if (isGroup) {
    await db.chatgroupmessage.update({
      where: { id: messageId },
      data: { reactions: updatedReactionsStr }
    });
  } else {
    await db.chatmessage.update({
      where: { id: messageId },
      data: { reactions: updatedReactionsStr }
    });
  }

  revalidatePath("/chat-space");
  return { success: true, reactions };
}

export async function toggleDndModeAction() {
  const user = await enforceAuth();

  const currentUserData = await db.user.findUnique({ where: { id: user.id } });
  if (!currentUserData) throw new Error("User not found.");

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: {
      isDnd: !currentUserData.isDnd
    }
  });

  revalidatePath("/chat-space");
  return { success: true, isDnd: updatedUser.isDnd };
}

export async function forwardChatMessageAction(messageText: string, targetId: string, isTargetGroup: boolean) {
  const user = await enforceAuth();

  if (isTargetGroup) {
    const membership = await db.chatgroupmember.findUnique({
      where: { groupId_userId: { groupId: targetId, userId: user.id } }
    });
    if (!membership) throw new Error("UNAUTHORIZED: You are not a member of the target group.");

    await db.chatgroupmessage.create({
      data: {
        id: crypto.randomUUID(),
        groupId: targetId,
        senderId: user.id,
        message: messageText,
        isForwarded: true
      }
    });
  } else {
    const receiver = await db.user.findUnique({ where: { id: targetId } });
    if (!receiver) throw new Error("Recipient not found.");
    if (user.role !== "SUPER_ADMIN" && receiver.role !== "SUPER_ADMIN" && receiver.companyId !== user.companyId) {
      throw new Error("UNAUTHORIZED: You can only communicate within your company.");
    }

    await db.chatmessage.create({
      data: {
        id: crypto.randomUUID(),
        senderId: user.id,
        receiverId: targetId,
        message: messageText,
        isForwarded: true
      }
    });
  }

  revalidatePath("/chat-space");
  return { success: true };
}

export async function leaveGroupAction(groupId: string) {
  const user = await enforceAuth();

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

  // Create system leave message before deleting membership (so we can bypass checks if needed, or create it as user)
  await db.chatgroupmessage.create({
    data: {
      id: crypto.randomUUID(),
      groupId,
      senderId: user.id,
      message: `📢 SYSTEM: ${user.name || "Colleague"} left the channel`,
      createdAt: new Date()
    }
  });

  // Delete membership
  await db.chatgroupmember.delete({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id
      }
    }
  });

  revalidatePath("/chat-space");
  return { success: true };
}

export async function deleteGroupAction(groupId: string) {
  const user = await enforceAuth();

  const group = await db.chatgroup.findUnique({
    where: { id: groupId }
  });

  if (!group) {
    throw new Error("Group not found.");
  }

  // Verify that the current user is the creator of the group
  if (group.createdById !== user.id) {
    throw new Error("UNAUTHORIZED: Only the group creator can delete this group.");
  }

  // Find all messages in the group to delete their stars
  const messages = await db.chatgroupmessage.findMany({
    where: { groupId },
    select: { id: true }
  });
  const messageIds = messages.map(m => m.id);

  // Delete all members, messages and the group itself in a transaction
  await db.$transaction([
    // Delete any stars on the group messages
    db.chatstar.deleteMany({
      where: {
        groupMessageId: { in: messageIds }
      }
    }),
    // Delete any pins of this group
    db.chatpin.deleteMany({
      where: {
        targetId: groupId,
        isGroup: true
      }
    }),
    db.chatgroupmember.deleteMany({ where: { groupId } }),
    db.chatgroupmessage.deleteMany({ where: { groupId } }),
    db.chatgroup.delete({ where: { id: groupId } })
  ]);

  revalidatePath("/chat-space");
  return { success: true };
}

export async function getChatBadgeStatusAction() {
  const user = await enforceAuth();
  
  // Count unread direct messages for this user
  const unreadDirect = await db.chatmessage.count({
    where: {
      receiverId: user.id,
      isRead: false
    }
  });

  // Count pending join requests for groups created by this user
  const pendingGroupRequests = await db.chatjoinrequest.count({
    where: {
      group: {
        createdById: user.id
      }
    }
  });

  return {
    hasUnread: unreadDirect > 0,
    hasJoinRequests: pendingGroupRequests > 0
  };
}


