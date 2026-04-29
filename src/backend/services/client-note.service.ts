import { prisma } from "@/backend/database/client";

export class ClientNoteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ClientNoteError";
  }
}

export async function listNotesForClient(astrologerProfileId: string, userId: string) {
  return prisma.clientNote.findMany({
    where: { astrologerProfileId, userId },
    orderBy: { createdAt: "desc" },
  });
}

export interface CreateNoteInput {
  astrologerProfileId: string;
  userId: string;
  bookingId?: string | null;
  content: string;
}

export async function createNote(input: CreateNoteInput) {
  const content = input.content.trim();
  if (content.length < 1 || content.length > 10_000) {
    throw new ClientNoteError(400, "content must be 1-10000 chars");
  }
  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      select: { astrologerProfileId: true, userId: true },
    });
    if (!booking) throw new ClientNoteError(404, "booking not found");
    if (booking.astrologerProfileId !== input.astrologerProfileId) {
      throw new ClientNoteError(403, "booking does not belong to this astrologer");
    }
    if (booking.userId !== input.userId) {
      throw new ClientNoteError(400, "booking is not for this client");
    }
  }
  return prisma.clientNote.create({
    data: {
      astrologerProfileId: input.astrologerProfileId,
      userId: input.userId,
      bookingId: input.bookingId ?? null,
      content,
    },
  });
}

export async function updateNote(astrologerProfileId: string, noteId: string, content: string) {
  const trimmed = content.trim();
  if (trimmed.length < 1 || trimmed.length > 10_000) {
    throw new ClientNoteError(400, "content must be 1-10000 chars");
  }
  const existing = await prisma.clientNote.findUnique({
    where: { id: noteId },
    select: { astrologerProfileId: true },
  });
  if (!existing) throw new ClientNoteError(404, "note not found");
  if (existing.astrologerProfileId !== astrologerProfileId) {
    throw new ClientNoteError(403, "cannot modify another astrologer's note");
  }
  return prisma.clientNote.update({
    where: { id: noteId },
    data: { content: trimmed },
  });
}

export async function deleteNote(astrologerProfileId: string, noteId: string) {
  const existing = await prisma.clientNote.findUnique({
    where: { id: noteId },
    select: { astrologerProfileId: true },
  });
  if (!existing) throw new ClientNoteError(404, "note not found");
  if (existing.astrologerProfileId !== astrologerProfileId) {
    throw new ClientNoteError(403, "cannot delete another astrologer's note");
  }
  await prisma.clientNote.delete({ where: { id: noteId } });
  return { ok: true };
}
