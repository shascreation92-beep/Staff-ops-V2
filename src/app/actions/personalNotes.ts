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

export async function sharePersonalNoteWithTeamAction(noteId: string) {
  const user = await enforceAuth(["TEAM_LEAD"]);

  const note = await db.personalnote.findFirst({
    where: { id: noteId, userId: user.id }
  });

  if (!note) {
    throw new Error("Note not found or unauthorized.");
  }

  // Find all Sales Associates reporting to this Team Lead
  const associates = await db.user.findMany({
    where: {
      teamLeadId: user.id,
      role: "SALES_ASSOCIATE",
      status: "APPROVED"
    }
  });

  let shareCount = 0;
  for (const associate of associates) {
    // Check if there is already a cloned note from this source
    const existingAnnouncement = await db.personalnote.findFirst({
      where: {
        userId: associate.id,
        sharedFromNoteId: note.id,
        isSharedAnnouncement: true
      }
    });

    if (existingAnnouncement) {
      await db.personalnote.update({
        where: { id: existingAnnouncement.id },
        data: {
          title: note.title,
          content: note.content,
          color: note.color,
          isChecklist: note.isChecklist,
          category: note.category,
          sharedFromTlName: user.name || "Team Lead",
          updatedAt: new Date()
        }
      });
    } else {
      await db.personalnote.create({
        data: {
          userId: associate.id,
          title: note.title,
          content: note.content,
          color: note.color,
          isChecklist: note.isChecklist,
          category: note.category,
          isSharedAnnouncement: true,
          sharedFromTlName: user.name || "Team Lead",
          sharedFromNoteId: note.id
        }
      });
    }
    shareCount++;
  }

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
