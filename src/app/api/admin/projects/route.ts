import { desc } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, projects } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { safeResourceUrlSchema } from "@/lib/validation";

const schema = z.object({ slug: z.string().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().trim().min(3).max(120), description: z.string().trim().min(10).max(400), tech: z.array(z.string().trim().min(1).max(30)).min(1).max(10), previewUrl: safeResourceUrlSchema, downloadUrl: safeResourceUrlSchema, status: z.enum(["draft", "published"]).default("draft") });

export async function GET() {
  const admin = await requireAdmin(); if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const db = await getDatabase(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  return Response.json({ projects: await db.select().from(projects).orderBy(desc(projects.createdAt)) });
}

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin(); if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return Response.json({ message: "Check the project fields." }, { status: 400 });
  const db = await getDatabase(); const id = crypto.randomUUID(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  await db.insert(projects).values({ id, ...parsed.data });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "project.create", targetType: "project", targetId: id });
  return Response.json({ id }, { status: 201 });
}
