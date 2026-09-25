import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { auditLogs, projects } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { adminProjectSchema } from "@/lib/admin-project-schema";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const admin = await requireAdmin(); if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const { id } = await params; const db = await getDatabase(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return Response.json({ message: "Project not found." }, { status: 404 });
  return Response.json({ project }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin(); if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const parsed = adminProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Check the project fields." }, { status: 400 });
  const { id } = await params; const db = await getDatabase(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [slugOwner] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, parsed.data.slug)).limit(1);
  if (slugOwner && slugOwner.id !== id) return Response.json({ message: "This project URL slug is already in use." }, { status: 409 });
  const [project] = await db.update(projects).set({ ...parsed.data, coverUrl: parsed.data.coverUrl || null, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
  if (!project) return Response.json({ message: "Project not found." }, { status: 404 });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "project.update", targetType: "project", targetId: id });
  return Response.json({ project });
}

export async function DELETE(request: Request, { params }: Context) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin(); if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const { id } = await params; const db = await getDatabase(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
  if (!deleted.length) return Response.json({ message: "Project not found." }, { status: 404 });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "project.delete", targetType: "project", targetId: id });
  return Response.json({ id });
}
