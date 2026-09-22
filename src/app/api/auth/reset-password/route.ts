import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { otps, sessions, users } from "@/db/schema";
import { getEnvironment } from "@/lib/environment";
import { hashOtp, hashPassword, timingSafeEqual } from "@/lib/security";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { strongPasswordSchema } from "@/lib/validation";

const inputSchema = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), code: z.string().regex(/^\d{6}$/), password: strongPasswordSchema });

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "auth.reset", 5, 600);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] || "");
      if (!field || errors[field]) continue;
      if (field === "password") errors.password = issue.message;
      if (field === "code") errors.code = "Enter the complete six-digit code.";
    }
    return Response.json({ message: Object.keys(errors).length ? "Please check the highlighted fields." : "Request a new recovery link and try again.", errors }, { status: 400 });
  }
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Account storage is unavailable." }, { status: 503 });
  const [record] = await db.select().from(otps).where(and(eq(otps.email, parsed.data.email), eq(otps.purpose, "reset_password"), isNull(otps.consumedAt), gt(otps.expiresAt, new Date()))).orderBy(desc(otps.createdAt)).limit(1);
  if (!record || record.attempts >= 5) return Response.json({ message: "The code is invalid or has expired.", errors: { code: "The code is invalid, expired, or no longer active." } }, { status: 400 });
  const { authSecret } = await getEnvironment();
  const valid = timingSafeEqual(await hashOtp(parsed.data.email, parsed.data.code, authSecret), record.codeHash);
  if (!valid) { await db.update(otps).set({ attempts: record.attempts + 1 }).where(eq(otps.id, record.id)); return Response.json({ message: "The code is invalid or has expired.", errors: { code: "That code does not match. Check the latest email and try again." } }, { status: 400 }); }
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user) return Response.json({ message: "The code is invalid or has expired.", errors: { code: "The code is invalid, expired, or no longer active." } }, { status: 400 });
  const now = new Date();
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: now }).where(eq(users.id, user.id));
  await db.update(otps).set({ consumedAt: now }).where(eq(otps.id, record.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  return Response.json({ message: "Your password has been updated." });
}
