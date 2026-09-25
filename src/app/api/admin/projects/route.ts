import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { auditLogs, projects } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { adminProjectSchema } from "@/lib/admin-project-schema";

export async function GET() {
  const admin = await requireAdmin(); if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const db = await getDatabase(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  return Response.json({ projects: await db.select().from(projects).orderBy(desc(projects.createdAt)) });
}

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin(); if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const parsed = adminProjectSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return Response.json({ message: "Check the project fields." }, { status: 400 });
  const db = await getDatabase(); const id = crypto.randomUUID(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [existing] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, parsed.data.slug)).limit(1);
  if (existing) return Response.json({ message: "This project URL slug is already in use." }, { status: 409 });
  await db.insert(projects).values({ id, ...parsed.data, coverUrl: parsed.data.coverUrl || null });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "project.create", targetType: "project", targetId: id });
  return Response.json({ id }, { status: 201 });
}
