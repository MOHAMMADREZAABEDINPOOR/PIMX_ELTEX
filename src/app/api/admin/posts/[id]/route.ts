import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { auditLogs, episodePrompts, episodeResources, posts } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { optionalResourceUrlSchema, safeResourceUrlSchema } from "@/lib/validation";

const fileSchema = z.object({ path: z.string().trim().min(1).max(500), size: z.number().int().min(1).max(20 * 1024 * 1024), type: z.string().trim().max(120) });
const promptSchema = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(400).optional(), content: z.string().trim().min(1).max(60_000), previewUrl: optionalResourceUrlSchema.optional(), downloadUrl: optionalResourceUrlSchema.optional(), fileCount: z.number().int().min(0).max(250).default(0), totalBytes: z.number().int().min(0).max(45 * 1024 * 1024).default(0), files: z.array(fileSchema).max(250).default([]), sortOrder: z.number().int().min(0).max(1000) });
const linkSchema = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(400).optional(), url: safeResourceUrlSchema, sortOrder: z.number().int().min(0).max(1000) });
const youtubeVideoSchema = z.string().trim().min(1).max(500).refine((value) => Boolean(extractYouTubeVideoId(value)), "Enter a valid YouTube video URL.").transform((value) => extractYouTubeVideoId(value)!);
const updateSchema = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), title: z.string().trim().min(5).max(160).optional(), excerpt: z.string().trim().min(10).max(320).optional(), content: z.string().trim().min(20).optional(), youtubeVideoId: youtubeVideoSchema.optional(), category: z.string().trim().min(2).max(60).optional(), status: z.enum(["draft", "scheduled", "published"]).optional(), prompts: z.array(promptSchema).max(50).optional(), links: z.array(linkSchema).max(100).optional() });
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const { id } = await params;
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) return Response.json({ message: "Episode not found." }, { status: 404 });
  const [prompts, resources] = await Promise.all([
    db.select().from(episodePrompts).where(eq(episodePrompts.postId, id)).orderBy(asc(episodePrompts.sortOrder)),
    db.select().from(episodeResources).where(eq(episodeResources.postId, id)).orderBy(asc(episodeResources.sortOrder)),
  ]);
  return Response.json({ episode: { ...post, prompts, links: resources.filter((resource) => resource.type === "link") } });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: parsed.error.issues.find((issue) => issue.path[0] === "youtubeVideoId")?.message || "Check the article fields." }, { status: 400 });
  const { id } = await params; const db = await getDatabase();
  if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const { prompts: promptItems, links, ...postData } = parsed.data;
  const updated = await db.update(posts).set({ ...postData, ...(postData.status === "published" ? { publishedAt: new Date() } : {}), updatedAt: new Date() }).where(eq(posts.id, id)).returning({ id: posts.id });
  if (!updated.length) return Response.json({ message: "Episode not found." }, { status: 404 });
  if (promptItems) {
    await db.delete(episodePrompts).where(eq(episodePrompts.postId, id));
    if (promptItems.length) await db.insert(episodePrompts).values(promptItems.map((prompt) => ({ id: crypto.randomUUID(), postId: id, ...prompt })));
  }
  if (links) {
    await db.delete(episodeResources).where(eq(episodeResources.postId, id));
    if (links.length) await db.insert(episodeResources).values(links.map((link) => ({ id: crypto.randomUUID(), postId: id, type: "link" as const, title: link.title, description: link.description, url: link.url, sortOrder: link.sortOrder })));
  }
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "post.update", targetType: "post", targetId: id });
  return Response.json({ id });
}

export async function DELETE(request: Request, { params }: Context) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const { id } = await params; const db = await getDatabase();
  if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const deleted = await db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
  if (!deleted.length) return Response.json({ message: "Episode not found." }, { status: 404 });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "post.delete", targetType: "post", targetId: id });
  return Response.json({ id });
}
