"use server";

import { revalidatePath } from "next/cache";
import { enforceAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function getPersonalNotesAction() {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  try {
    const notes = await db.personalnote.findMany({
      where: { userId: user.id },
      orderBy: [
        { isPinned: "desc" },
        { updatedAt: "desc" }
      ]
    });
    return { success: true, notes };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch personal notes.");
  }
}

export async function createPersonalNoteAction(data: {
  title: string;
  content: string;
  isChecklist?: boolean;
  color?: string;
  category?: string;
}) {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  try {
    const note = await db.personalnote.create({
      data: {
        userId: user.id,
        title: data.title,
        content: data.content,
        isChecklist: data.isChecklist ?? false,
        color: data.color ?? "default",
        category: data.category ?? "Work"
      }
    });

    try {
      revalidatePath("/personal-notes");
    } catch (revalErr) {}

    return { success: true, note };
  } catch (error: any) {
    throw new Error(error.message || "Failed to create personal note.");
  }
}

export async function updatePersonalNoteAction(
  noteId: string,
  data: {
    title?: string;
    content?: string;
    isPinned?: boolean;
    color?: string;
    isChecklist?: boolean;
    category?: string;
  }
) {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  const note = await db.personalnote.findUnique({
    where: { id: noteId }
  });

  if (!note) {
    throw new Error("Note not found.");
  }

  if (note.userId !== user.id) {
    throw new Error("UNAUTHORIZED: You cannot edit someone else's note.");
  }

  if (note.isSharedAnnouncement && (data.title !== undefined || data.content !== undefined || data.isChecklist !== undefined || data.category !== undefined)) {
    throw new Error("UNAUTHORIZED: Shared announcements are read-only.");
  }

  try {
    const updatedNote = await db.personalnote.update({
      where: { id: noteId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    try {
      revalidatePath("/personal-notes");
    } catch (revalErr) {}

    return { success: true, note: updatedNote };
  } catch (error: any) {
    throw new Error(error.message || "Failed to update personal note.");
  }
}

export async function deletePersonalNoteAction(noteId: string) {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  const note = await db.personalnote.findUnique({
    where: { id: noteId }
  });

  if (!note) {
    throw new Error("Note not found.");
  }

  if (note.userId !== user.id) {
    throw new Error("UNAUTHORIZED: You cannot delete someone else's note.");
  }

  try {
    if (note.isSharedByMe) {
      await db.personalnote.deleteMany({
        where: { sharedFromNoteId: note.id }
      });
    }

    await db.personalnote.delete({
      where: { id: noteId }
    });

    try {
      revalidatePath("/personal-notes");
    } catch (revalErr) {}

    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete personal note.");
  }
}

export async function sharePersonalNoteWithTeamAction(
  noteId: string,
  isGlobalPinned: boolean = false,
  targetUserIds?: string[]
) {
  const user = await enforceAuth(["TEAM_LEAD", "SALES_ASSOCIATE"]);

  const note = await db.personalnote.findFirst({
    where: { id: noteId, userId: user.id }
  });

  if (!note) {
    throw new Error("Note not found or unauthorized.");
  }

  let targets: string[] = [];

  if (user.role === "TEAM_LEAD") {
    // Find all Sales Associates reporting to this Team Lead
    const associates = await db.user.findMany({
      where: {
        teamLeadId: user.id,
        role: "SALES_ASSOCIATE",
        status: "APPROVED"
      },
      select: { id: true }
    });
    const associateIds = associates.map(a => a.id);

    if (targetUserIds && targetUserIds.length > 0) {
      // Filter targetUserIds to ensure they are valid associates under this TL
      targets = targetUserIds.filter(id => associateIds.includes(id));
    } else {
      targets = associateIds;
    }
  } else {
    // User is a SALES_ASSOCIATE
    const associateUser = await db.user.findUnique({
      where: { id: user.id },
      select: { teamLeadId: true }
    });

    if (associateUser?.teamLeadId) {
      // Fetch direct TL and peer associates under the same TL
      const tl = await db.user.findFirst({
        where: { id: associateUser.teamLeadId, status: "APPROVED" },
        select: { id: true }
      });
      const peers = await db.user.findMany({
        where: {
          teamLeadId: associateUser.teamLeadId,
          role: "SALES_ASSOCIATE",
          status: "APPROVED",
          id: { not: user.id }
        },
        select: { id: true }
      });

      const allowedIds: string[] = [];
      if (tl) allowedIds.push(tl.id);
      peers.forEach(p => allowedIds.push(p.id));

      if (targetUserIds && targetUserIds.length > 0) {
        targets = targetUserIds.filter(id => allowedIds.includes(id));
      } else {
        targets = allowedIds;
      }
    }
  }

  // Delete any existing clones that are no longer targeted
  await db.personalnote.deleteMany({
    where: {
      sharedFromNoteId: note.id,
      userId: { notIn: targets }
    }
  });

  let shareCount = 0;
  for (const targetId of targets) {
    // Check if there is already a cloned note from this source
    const existingAnnouncement = await db.personalnote.findFirst({
      where: {
        userId: targetId,
        sharedFromNoteId: note.id,
        isSharedAnnouncement: true
      }
    });

    let clonedNoteId = "";
    if (existingAnnouncement) {
      const updated = await db.personalnote.update({
        where: { id: existingAnnouncement.id },
        data: {
          title: note.title,
          content: note.content,
          color: note.color,
          isChecklist: note.isChecklist,
          category: note.category,
          isGlobalPinned: isGlobalPinned,
          isPinned: isGlobalPinned ? true : existingAnnouncement.isPinned,
          timerExpiresAt: note.timerExpiresAt,
          sharedFromTlName: null, // Strict Database Anonymity
          updatedAt: new Date()
        }
      });
      clonedNoteId = updated.id;
    } else {
      const created = await db.personalnote.create({
        data: {
          userId: targetId,
          title: note.title,
          content: note.content,
          color: note.color,
          isChecklist: note.isChecklist,
          category: note.category,
          isSharedAnnouncement: true,
          isGlobalPinned: isGlobalPinned,
          isPinned: isGlobalPinned,
          timerExpiresAt: note.timerExpiresAt,
          sharedFromTlName: null, // Strict Database Anonymity
          sharedFromNoteId: note.id
        }
      });
      clonedNoteId = created.id;
    }

    let isPoll = false;
    let messageText = note.content;
    try {
      const parsed = JSON.parse(note.content);
      if (parsed && parsed.type === "poll") {
        isPoll = true;
        messageText = `Poll: ${note.title}. Options: ${parsed.options.filter(Boolean).join(", ")}`;
      }
    } catch (e) {}

    const notifTitle = isPoll ? "📊 New Team Poll: Vote Now!" : "📢 New Team Announcement";

    // Create an anonymous Team Announcement notification for the target user
    await db.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: targetId,
        title: notifTitle,
        message: `[NOTE_ID:${clonedNoteId}] ${messageText.substring(0, 80)}`,
        type: "TEAM_ANNOUNCEMENT",
        isRead: false
      }
    });

    shareCount++;
  }

  // Mark the source note as shared by the current user
  await db.personalnote.update({
    where: { id: noteId },
    data: { isSharedByMe: shareCount > 0 }
  });

  try {
    revalidatePath("/personal-notes");
  } catch (revalErr) {}

  return { success: true, count: shareCount };
}

export async function cloneSharedAnnouncementAction(noteId: string) {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  const announcement = await db.personalnote.findFirst({
    where: {
      id: noteId,
      userId: user.id,
      isSharedAnnouncement: true
    }
  });

  if (!announcement) {
    throw new Error("Announcement not found or unauthorized.");
  }

  try {
    const personalCopy = await db.personalnote.create({
      data: {
        userId: user.id,
        title: `Copy of: ${announcement.title}`,
        content: announcement.content,
        color: announcement.color,
        isChecklist: announcement.isChecklist,
        category: announcement.category,
        isSharedAnnouncement: false,
        sharedFromNoteId: null,
        sharedFromTlName: null
      }
    });

    try {
      revalidatePath("/personal-notes");
    } catch (revalErr) {}

    return { success: true, note: personalCopy };
  } catch (error: any) {
    throw new Error(error.message || "Failed to clone announcement.");
  }
}

export async function updateNoteTimerAction(noteId: string, durationMinutes: number | null) {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  const note = await db.personalnote.findUnique({
    where: { id: noteId }
  });

  if (!note || note.userId !== user.id) {
    throw new Error("Note not found or unauthorized.");
  }

  let expiresAt: Date | null = null;
  if (durationMinutes !== null && durationMinutes > 0) {
    expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  }

  const updatedNote = await db.personalnote.update({
    where: { id: noteId },
    data: { timerExpiresAt: expiresAt }
  });

  // Propagate to all cloned notes of the team
  if (note.isSharedByMe) {
    await db.personalnote.updateMany({
      where: { sharedFromNoteId: note.id },
      data: { timerExpiresAt: expiresAt }
    });
  }

  try {
    revalidatePath("/personal-notes");
  } catch (e) {}

  return { success: true, note: updatedNote };
}

export async function acknowledgeSharedAnnouncementAction(noteId: string) {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  const announcement = await db.personalnote.findFirst({
    where: {
      id: noteId,
      userId: user.id,
      isSharedAnnouncement: true
    }
  });

  if (!announcement) {
    throw new Error("Announcement not found or unauthorized.");
  }

  await db.personalnote.update({
    where: { id: noteId },
    data: { isAcknowledged: true }
  });

  try {
    revalidatePath("/personal-notes");
  } catch (e) {}

  return { success: true };
}

export async function getPersonalNoteByIdAction(noteId: string) {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  const note = await db.personalnote.findUnique({
    where: { id: noteId }
  });

  if (!note) {
    throw new Error("Note not found.");
  }

  if (note.userId !== user.id) {
    throw new Error("UNAUTHORIZED: You cannot view this note.");
  }

  return { success: true, note };
}

export async function getTeamMembersAction() {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  try {
    if (user.role === "TEAM_LEAD") {
      // Return all active Sales Associates under this Team Lead
      const associates = await db.user.findMany({
        where: {
          teamLeadId: user.id,
          role: "SALES_ASSOCIATE",
          status: "APPROVED"
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });
      return { success: true, members: associates };
    } else {
      // User is a SALES_ASSOCIATE
      const associateUser = await db.user.findUnique({
        where: { id: user.id },
        select: { teamLeadId: true }
      });

      if (!associateUser?.teamLeadId) {
        return { success: true, members: [] };
      }

      // Fetch the Team Lead
      const tl = await db.user.findFirst({
        where: { id: associateUser.teamLeadId, status: "APPROVED" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      // Fetch peer Sales Associates (excluding current user)
      const peers = await db.user.findMany({
        where: {
          teamLeadId: associateUser.teamLeadId,
          role: "SALES_ASSOCIATE",
          status: "APPROVED",
          id: { not: user.id }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      const members: any[] = [];
      if (tl) {
        members.push({ id: tl.id, name: `Team Lead: ${tl.name || tl.email}`, email: tl.email, role: tl.role });
      }
      peers.forEach(p => {
        members.push({ id: p.id, name: `Peer: ${p.name || p.email}`, email: p.email, role: p.role });
      });

      return { success: true, members };
    }
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch team members.");
  }
}

export async function getNoteShareTargetsAction(noteId: string) {
  const user = await enforceAuth(["TEAM_LEAD", "SALES_ASSOCIATE"]);

  try {
    const clones = await db.personalnote.findMany({
      where: { sharedFromNoteId: noteId },
      select: { userId: true, isGlobalPinned: true }
    });

    const targetUserIds = clones.map(c => c.userId);
    const isGlobalPinned = clones.some(c => c.isGlobalPinned);

    return { success: true, targetUserIds, isGlobalPinned };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch share targets.");
  }
}

export async function castVoteAction(noteId: string, optionIndex: number) {
  const user = await enforceAuth(["SALES_ASSOCIATE", "TEAM_LEAD"]);

  const note = await db.personalnote.findUnique({
    where: { id: noteId }
  });

  if (!note) {
    throw new Error("Poll not found.");
  }

  if (note.timerExpiresAt && new Date() > new Date(note.timerExpiresAt)) {
    throw new Error("This poll has expired.");
  }

  const masterNoteId = note.sharedFromNoteId || note.id;

  const masterNote = await db.personalnote.findUnique({
    where: { id: masterNoteId }
  });

  if (!masterNote) {
    throw new Error("Master poll not found.");
  }

  let pollData;
  try {
    pollData = JSON.parse(masterNote.content);
  } catch (e) {
    throw new Error("Invalid poll format.");
  }

  if (pollData.type !== "poll") {
    throw new Error("Note is not in poll mode.");
  }

  if (!pollData.votes) {
    pollData.votes = [];
  }

  const existingVoteIdx = pollData.votes.findIndex((v: any) => v.userId === user.id);
  if (existingVoteIdx >= 0) {
    pollData.votes[existingVoteIdx].optionIndex = optionIndex;
    pollData.votes[existingVoteIdx].userName = user.name || user.email;
  } else {
    pollData.votes.push({
      userId: user.id,
      userName: user.name || user.email,
      optionIndex
    });
  }

  const updatedContent = JSON.stringify(pollData);

  await db.personalnote.update({
    where: { id: masterNoteId },
    data: { content: updatedContent }
  });

  await db.personalnote.updateMany({
    where: { sharedFromNoteId: masterNoteId },
    data: { content: updatedContent }
  });

  try {
    revalidatePath("/personal-notes");
  } catch (e) {}

  return { success: true };
}
