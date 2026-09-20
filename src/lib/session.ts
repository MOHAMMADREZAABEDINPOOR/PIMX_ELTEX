import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDatabase } from "@/db";
import { sessions, users } from "@/db/schema";
import { sha256 } from "./security";

export async function getCurrentUser() {
  const token = (await cookies()).get("pimx_session")?.value;
  if (!token) return null;
  const db = await getDatabase();
  if (!db) return null;
  const tokenHash = await sha256(token);
  const result = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date()))).limit(1);
  const user = result[0];
  return user?.status === "active" ? user : null;
}
