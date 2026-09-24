import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { otps, users } from "@/db/schema";
import { getEnvironment } from "@/lib/environment";
import { hashOtp, timingSafeEqual } from "@/lib/security";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const inputSchema = z.object({ email: z.email().transform((value) => value.toLowerCase()), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "auth.verify", 8, 600);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter a valid six-digit code.", errors: { code: "Enter the complete six-digit code." } }, { status: 400 });
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Account storage is unavailable." }, { status: 503 });
  const [record] = await db.select().from(otps).where(and(eq(otps.email, parsed.data.email), eq(otps.purpose, "verify_email"), isNull(otps.consumedAt), gt(otps.expiresAt, new Date()))).orderBy(desc(otps.createdAt)).limit(1);
  if (!record || record.attempts >= 5) return Response.json({ message: "The code is invalid or has expired.", errors: { code: "The code is invalid, expired, or no longer active." } }, { status: 400 });
  const [attempt] = await db.update(otps).set({ attempts: sql`${otps.attempts} + 1` }).where(and(eq(otps.id, record.id), lt(otps.attempts, 5), isNull(otps.consumedAt), gt(otps.expiresAt, new Date()))).returning({ id: otps.id });
  if (!attempt) return Response.json({ message: "The code is invalid or has expired.", errors: { code: "The code is invalid, expired, or no longer active." } }, { status: 400 });
  const { authSecret } = await getEnvironment();
  const candidate = await hashOtp(parsed.data.email, parsed.data.code, authSecret);
  if (!timingSafeEqual(candidate, record.codeHash)) {
    return Response.json({ message: "The code is invalid or has expired.", errors: { code: "That code does not match. Check the latest email and try again." } }, { status: 400 });
  }
  const now = new Date();
  const [consumed] = await db.update(otps).set({ consumedAt: now }).where(and(eq(otps.id, record.id), isNull(otps.consumedAt), gt(otps.expiresAt, now))).returning({ id: otps.id });
  if (!consumed) return Response.json({ message: "The code is invalid or has expired.", errors: { code: "The code is invalid, expired, or no longer active." } }, { status: 400 });
  await db.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.email, parsed.data.email));
  return Response.json({ message: "Your email has been verified." });
}
