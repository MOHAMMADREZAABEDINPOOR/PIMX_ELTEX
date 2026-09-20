import { desc } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { auditLogs, episodePrompts, episodeResources, posts } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { optionalResourceUrlSchema, safeResourceUrlSchema } from "@/lib/validation";

const resourceSchema = z.object({ type: z.enum(["prompt", "link", "code", "download"]), title: z.string().trim().min(1).max(120), description: z.string().trim().max(400).optional(), content: z.string().max(30_000).optional(), url: optionalResourceUrlSchema.optional(), language: z.string().trim().max(100).optional(), sortOrder: z.number().int().min(0).max(1000) });
const fileSchema = z.object({ path: z.string().trim().min(1).max(500), size: z.number().int().min(1).max(20 * 1024 * 1024), type: z.string().trim().max(120) });
const promptSchema = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(400).optional(), content: z.string().trim().min(1).max(60_000), previewUrl: optionalResourceUrlSchema.optional(), downloadUrl: optionalResourceUrlSchema.optional(), fileCount: z.number().int().min(0).max(250).default(0), totalBytes: z.number().int().min(0).max(45 * 1024 * 1024).default(0), files: z.array(fileSchema).max(250).default([]), sortOrder: z.number().int().min(0).max(1000) });
const linkSchema = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(400).optional(), url: safeResourceUrlSchema, sortOrder: z.number().int().min(0).max(1000) });
const youtubeVideoSchema = z.string().trim().min(1).max(500).refine((value) => Boolean(extractYouTubeVideoId(value)), "Enter a valid YouTube video URL.").transform((value) => extractYouTubeVideoId(value)!);
const postSchema = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().trim().min(5).max(160), excerpt: z.string().trim().min(10).max(320), content: z.string().trim().min(20), youtubeVideoId: youtubeVideoSchema, category: z.string().trim().min(2).max(60), status: z.enum(["draft", "scheduled", "published"]).default("draft"), resources: z.array(resourceSchema).max(50).optional(), prompts: z.array(promptSchema).max(50).optional(), links: z.array(linkSchema).max(100).optional() });

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  return Response.json({ posts: await db.select().from(posts).orderBy(desc(posts.createdAt)) });
}

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin();
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: parsed.error.issues.find((issue) => issue.path[0] === "youtubeVideoId")?.message || "Check the article fields." }, { status: 400 });
  const db = await getDatabase();
  const id = crypto.randomUUID();
  if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const { resources = [], prompts: promptItems = [], links = [], ...post } = parsed.data;
  await db.insert(posts).values({ id, authorId: admin.id, ...post, publishedAt: post.status === "published" ? new Date() : null });
  if (resources.length) await db.insert(episodeResources).values(resources.map((resource) => ({ id: crypto.randomUUID(), postId: id, ...resource })));
  if (promptItems.length) await db.insert(episodePrompts).values(promptItems.map((prompt) => ({ id: crypto.randomUUID(), postId: id, ...prompt })));
  if (links.length) await db.insert(episodeResources).values(links.map((link) => ({ id: crypto.randomUUID(), postId: id, type: "link" as const, title: link.title, description: link.description, url: link.url, sortOrder: link.sortOrder })));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "post.create", targetType: "post", targetId: id });
  return Response.json({ id }, { status: 201 });
}
