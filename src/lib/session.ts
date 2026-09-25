import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDatabase } from "@/db";
import { sessions, users } from "@/db/schema";
import { sha256 } from "./security";
import { SESSION_COOKIE_NAME, sessionIsActive, shouldTouchSession } from "./session-policy";

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const db = await getDatabase();
  if (!db) return null;
  try {
    const [record] = await db.select({
      id: users.id, name: users.name, username: users.username, email: users.email, avatarUrl: users.avatarUrl, role: users.role, status: users.status, adminPermissions: users.adminPermissions,
      sessionId: sessions.id, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, expiresAt: sessions.expiresAt,
    }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.tokenHash, await sha256(token))).limit(1);
    if (!record) return null;
    const now = Date.now();
    if (record.status !== "active" || !sessionIsActive(record, record.role, now)) {
      await db.delete(sessions).where(and(eq(sessions.id, record.sessionId), eq(sessions.lastSeenAt, record.lastSeenAt))).catch(() => undefined);
      return null;
    }
    if (shouldTouchSession(record.lastSeenAt, record.role, now)) {
      await db.update(sessions).set({ lastSeenAt: new Date(now) }).where(and(eq(sessions.id, record.sessionId), eq(sessions.lastSeenAt, record.lastSeenAt), gt(sessions.expiresAt, new Date(now)))).catch(() => undefined);
    }
    const { id, name, username, email, avatarUrl, role, status, adminPermissions } = record;
    return { id, name, username, email, avatarUrl, role, status, adminPermissions };
  } catch (error) {
    console.error("Session lookup failed", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}
