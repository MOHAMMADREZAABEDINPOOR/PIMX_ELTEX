import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { commentLikes, comments, posts, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { initials } from "@/lib/utils";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { captchaRequiredResponse } from "@/lib/rate-limit";
import { getEnvironment, verifyTurnstile } from "@/lib/environment";

const slugSchema = z.string().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const createSchema = z.object({ postSlug: slugSchema, parentId: z.string().uuid().nullable().optional(), content: z.string().trim().min(2).max(1200), turnstileToken: z.string().optional() });

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("post");
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) return Response.json({ message: "Valid post is required." }, { status: 400 });
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Comments are unavailable." }, { status: 503 });
  const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.slug, parsedSlug.data), eq(posts.status, "published"))).limit(1);
  if (!post) return Response.json({ comments: [] });
  const currentUser = await getCurrentUser();
  const [rows, viewerReactions] = await Promise.all([
    db.select({ id: comments.id, parentId: comments.parentId, content: comments.content, createdAt: comments.createdAt, editedAt: comments.editedAt, authorId: users.id, authorName: users.name, role: users.role, likes: sql<number>`coalesce(sum(case when ${commentLikes.reaction} = 1 then 1 else 0 end), 0)`, dislikes: sql<number>`coalesce(sum(case when ${commentLikes.reaction} = -1 then 1 else 0 end), 0)` }).from(comments).innerJoin(users, eq(users.id, comments.authorId)).leftJoin(commentLikes, eq(commentLikes.commentId, comments.id)).where(and(eq(comments.postId, post.id), eq(comments.status, "visible"))).groupBy(comments.id).orderBy(asc(comments.createdAt)).limit(500),
    currentUser ? db.select({ commentId: commentLikes.commentId, reaction: commentLikes.reaction }).from(commentLikes).innerJoin(comments, eq(comments.id, commentLikes.commentId)).where(and(eq(comments.postId, post.id), eq(comments.status, "visible"), eq(commentLikes.userId, currentUser.id))) : Promise.resolve([]),
  ]);
  const reactionByComment = new Map(viewerReactions.map((item) => [item.commentId, item.reaction]));
  const nodes = new Map(rows.map((row) => [row.id, { id: row.id, author: { name: row.authorName, initials: initials(row.authorName), role: row.role === "admin" ? "Admin" : undefined }, content: row.content, createdAt: row.createdAt.toISOString(), likes: Number(row.likes), dislikes: Number(row.dislikes), reaction: reactionByComment.get(row.id) as 1 | -1 | undefined, edited: Boolean(row.editedAt), isOwner: currentUser?.id === row.authorId, replies: [] as unknown[] }]));
  const roots: unknown[] = [];
  for (const row of rows) { const node = nodes.get(row.id); const parent = row.parentId ? nodes.get(row.parentId) : null; if (parent && node) parent.replies.push(node); else if (node) roots.push(node); }
  return Response.json({ comments: roots });
}

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "comments.create", 10, 60);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Sign in to join the discussion." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Comment must be between 2 and 1,200 characters." }, { status: 400 });
  if (guard.count > 4) {
    const environment = await getEnvironment();
    if (!(await verifyTurnstile(parsed.data.turnstileToken, environment.turnstileSecret))) return captchaRequiredResponse();
  }
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Comments are unavailable." }, { status: 503 });
  const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.slug, parsed.data.postSlug), eq(posts.status, "published"))).limit(1);
  if (!post) return Response.json({ message: "Post not found." }, { status: 404 });
  if (parsed.data.parentId) {
    const [parent] = await db.select({ id: comments.id }).from(comments).where(and(eq(comments.id, parsed.data.parentId), eq(comments.postId, post.id), eq(comments.status, "visible"))).limit(1);
    if (!parent) return Response.json({ message: "The parent comment is not available." }, { status: 400 });
  }
  const id = crypto.randomUUID();
  await db.insert(comments).values({ id, postId: post.id, authorId: user.id, parentId: parsed.data.parentId || null, content: parsed.data.content });
  return Response.json({ id }, { status: 201 });
}
