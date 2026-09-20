import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { comments } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

const editSchema = z.object({ content: z.string().trim().min(2).max(1200) });

type CommentContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: CommentContext) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Sign in required." }, { status: 401 });
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid comment." }, { status: 400 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ message: "Comment not found." }, { status: 404 });
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Comments are unavailable." }, { status: 503 });
  const result = await db.update(comments).set({ content: parsed.data.content, editedAt: new Date(), updatedAt: new Date() }).where(and(eq(comments.id, id), eq(comments.authorId, user.id), eq(comments.status, "visible"))).returning({ id: comments.id });
  if (!result.length) return Response.json({ message: "Comment not found or not editable." }, { status: 404 });
  return Response.json({ id });
}

export async function DELETE(request: Request, { params }: CommentContext) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Sign in required." }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ message: "Comment not found." }, { status: 404 });
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Comments are unavailable." }, { status: 503 });
  const deleted = await db.delete(comments).where(user.role === "admin" ? eq(comments.id, id) : and(eq(comments.id, id), eq(comments.authorId, user.id))).returning({ id: comments.id });
  if (!deleted.length) return Response.json({ message: "Comment not found or not removable." }, { status: 404 });
  return Response.json({ id, deleted: true });
}
