import { and, desc, eq, gt, isNull } from "drizzle-orm";
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
  if (!parsed.success) return Response.json({ message: "Enter a valid six-digit code." }, { status: 400 });
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Account storage is unavailable." }, { status: 503 });
  const [record] = await db.select().from(otps).where(and(eq(otps.email, parsed.data.email), eq(otps.purpose, "verify_email"), isNull(otps.consumedAt), gt(otps.expiresAt, new Date()))).orderBy(desc(otps.createdAt)).limit(1);
  if (!record || record.attempts >= 5) return Response.json({ message: "The code is invalid or has expired." }, { status: 400 });
  const { authSecret } = await getEnvironment();
  const candidate = await hashOtp(parsed.data.email, parsed.data.code, authSecret);
  if (!timingSafeEqual(candidate, record.codeHash)) {
    await db.update(otps).set({ attempts: record.attempts + 1 }).where(eq(otps.id, record.id));
    return Response.json({ message: "The code is invalid or has expired." }, { status: 400 });
  }
  const now = new Date();
  await db.update(otps).set({ consumedAt: now }).where(eq(otps.id, record.id));
  await db.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.email, parsed.data.email));
  return Response.json({ message: "Your email has been verified." });
}
