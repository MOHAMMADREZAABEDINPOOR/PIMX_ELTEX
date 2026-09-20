import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { auditLogs, projects } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin(); if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const { id } = await params; const db = await getDatabase(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
  if (!deleted.length) return Response.json({ message: "Project not found." }, { status: 404 });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "project.delete", targetType: "project", targetId: id });
  return Response.json({ id });
}
