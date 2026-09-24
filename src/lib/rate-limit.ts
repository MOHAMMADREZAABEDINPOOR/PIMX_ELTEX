import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { rateLimits } from "@/db/schema";
import { sha256 } from "./security";

async function maybePruneExpiredSecurityRows(db: NonNullable<Awaited<ReturnType<typeof getDatabase>>>, now: number) {
  if (Math.random() >= 0.001) return;
  const cutoff = Math.floor(now / 1_000);
  try {
    await db.run(sql`DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at < ${cutoff} LIMIT 1000)`);
    await db.run(sql`DELETE FROM otps WHERE id IN (SELECT id FROM otps WHERE expires_at < ${cutoff} LIMIT 1000)`);
    await db.run(sql`DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires_at < ${cutoff} LIMIT 1000)`);
  } catch (error) {
    console.error("Security state cleanup failed", error instanceof Error ? error.message : "Unknown error");
  }
}

async function checkRateLimit(action: string, identity: string, limit: number, windowSeconds: number) {
  const db = await getDatabase();
  if (!db) return { allowed: process.env.NODE_ENV !== "production", retryAfter: windowSeconds, count: 1 };
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000));
  const key = await sha256(`${action}:${identity}:${windowStart}`);
  const expiresAt = new Date((windowStart + 1) * windowSeconds * 1000);
  const [record] = await db.insert(rateLimits).values({ key, action, expiresAt }).onConflictDoUpdate({ target: rateLimits.key, set: { count: sql`${rateLimits.count} + 1` } }).returning({ count: rateLimits.count });
  await maybePruneExpiredSecurityRows(db, now);
  const count = record?.count || 0;
  return { allowed: count <= limit, retryAfter: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)), count };
}

export function enforceRateLimit(request: Request, action: string, limit: number, windowSeconds: number) {
  const identity = request.headers.get("cf-connecting-ip") || "unknown";
  return checkRateLimit(action, identity, limit, windowSeconds);
}

export function enforceIdentityRateLimit(action: string, identity: string, limit: number, windowSeconds: number) {
  return checkRateLimit(action, identity.trim().toLowerCase(), limit, windowSeconds);
}

export function captchaRequiredResponse() {
  return Response.json({ captchaRequired: true, message: "Please complete the Cloudflare security check to continue." }, { status: 428 });
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json({ message: "Too many attempts. Please wait and try again." }, { status: 429, headers: { "retry-after": String(retryAfter) } });
}
