import type { Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";

export class TemplateError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TemplateError";
  }
}

export async function listTemplates(astrologerProfileId: string) {
  const [own, shared] = await Promise.all([
    prisma.consultTemplate.findMany({
      where: { astrologerProfileId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.consultTemplate.findMany({
      where: { isShared: true, astrologerProfileId: { not: astrologerProfileId } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);
  return { own, shared };
}

export async function createTemplate(
  astrologerProfileId: string,
  input: { title: string; body: string },
) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 1 || title.length > 200) throw new TemplateError(400, "title must be 1-200 chars");
  if (body.length < 1 || body.length > 10_000) throw new TemplateError(400, "body must be 1-10000 chars");
  return prisma.consultTemplate.create({
    data: { astrologerProfileId, title, body, isShared: false },
  });
}

export async function updateTemplate(
  astrologerProfileId: string,
  templateId: string,
  patch: { title?: string; body?: string },
) {
  const existing = await prisma.consultTemplate.findUnique({
    where: { id: templateId },
    select: { astrologerProfileId: true, isShared: true },
  });
  if (!existing) throw new TemplateError(404, "template not found");
  if (existing.astrologerProfileId !== astrologerProfileId) {
    throw new TemplateError(403, "cannot modify another astrologer's template");
  }
  const data: Prisma.ConsultTemplateUpdateInput = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (t.length < 1 || t.length > 200) throw new TemplateError(400, "title must be 1-200 chars");
    data.title = t;
  }
  if (patch.body !== undefined) {
    const b = patch.body.trim();
    if (b.length < 1 || b.length > 10_000) throw new TemplateError(400, "body must be 1-10000 chars");
    data.body = b;
  }
  return prisma.consultTemplate.update({ where: { id: templateId }, data });
}

export async function deleteTemplate(astrologerProfileId: string, templateId: string) {
  const existing = await prisma.consultTemplate.findUnique({
    where: { id: templateId },
    select: { astrologerProfileId: true },
  });
  if (!existing) throw new TemplateError(404, "template not found");
  if (existing.astrologerProfileId !== astrologerProfileId) {
    throw new TemplateError(403, "cannot delete another astrologer's template");
  }
  await prisma.consultTemplate.delete({ where: { id: templateId } });
  return { ok: true };
}

export async function renderTemplateForSession(astrologerProfileId: string, templateId: string) {
  const tpl = await prisma.consultTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) throw new TemplateError(404, "template not found");
  if (!tpl.isShared && tpl.astrologerProfileId !== astrologerProfileId) {
    throw new TemplateError(403, "template not accessible");
  }
  return { id: tpl.id, title: tpl.title, body: tpl.body };
}
