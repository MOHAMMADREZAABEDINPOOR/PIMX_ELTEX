import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { commentLikes, comments } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "comments.like", 60, 60);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Sign in required." }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ message: "Comment not found." }, { status: 404 });
  const parsed = z.object({ reaction: z.enum(["like", "dislike"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid reaction." }, { status: 400 });
  const requestedReaction = parsed.data.reaction === "dislike" ? -1 : 1;
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Comments are unavailable." }, { status: 503 });
  const [comment] = await db.select({ id: comments.id }).from(comments).where(and(eq(comments.id, id), eq(comments.status, "visible"))).limit(1);
  if (!comment) return Response.json({ message: "Comment not found." }, { status: 404 });
  await db.run(sql`insert into ${commentLikes} (comment_id, user_id, reaction) values (${id}, ${user.id}, ${requestedReaction}) on conflict (comment_id, user_id) do update set reaction = case when reaction = excluded.reaction then 0 else excluded.reaction end`);
  const [ownReaction] = await db.select({ reaction: commentLikes.reaction }).from(commentLikes).where(and(eq(commentLikes.commentId, id), eq(commentLikes.userId, user.id))).limit(1);
  const reaction = ownReaction?.reaction || 0;
  const [counts] = await db.select({ likes: sql<number>`coalesce(sum(case when ${commentLikes.reaction} = 1 then 1 else 0 end), 0)`, dislikes: sql<number>`coalesce(sum(case when ${commentLikes.reaction} = -1 then 1 else 0 end), 0)` }).from(commentLikes).where(eq(commentLikes.commentId, id));
  return Response.json({ reaction, likes: Number(counts?.likes || 0), dislikes: Number(counts?.dislikes || 0) });
}
