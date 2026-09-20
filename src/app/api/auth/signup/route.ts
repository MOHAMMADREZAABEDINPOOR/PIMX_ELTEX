import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { otps, users } from "@/db/schema";
import { sendOtpEmail } from "@/lib/email";
import { getEnvironment, verifyTurnstile } from "@/lib/environment";
import { getRequestMetadata } from "@/lib/request-metadata";
import { captchaRequiredResponse, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hashOtp, hashPassword, randomOtp } from "@/lib/security";
import { strongPasswordSchema } from "@/lib/validation";

const inputSchema = z.object({ name: z.string().trim().min(2).max(80), age: z.coerce.number().int().min(13).max(120), username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,24}$/), email: z.email().max(254).transform((value) => value.toLowerCase()), password: strongPasswordSchema, turnstileToken: z.string().optional() });

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "auth.signup", 5, 3600);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Please check the information you entered." }, { status: 400 });
  const environment = await getEnvironment();
  if (guard.count > 1 && !(await verifyTurnstile(parsed.data.turnstileToken, environment.turnstileSecret))) return captchaRequiredResponse();
  const db = await getDatabase();
  const code = randomOtp();
  if (!db) return Response.json({ message: "Account storage is unavailable." }, { status: 503 });
  const existing = await db.select({ id: users.id }).from(users).where(or(eq(users.email, parsed.data.email), eq(users.username, parsed.data.username))).limit(1);
  if (existing.length) return Response.json({ message: "An account with these details already exists." }, { status: 409 });
  const metadata = await getRequestMetadata(request);
  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, name: parsed.data.name, age: parsed.data.age, username: parsed.data.username, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), countryCode: metadata.countryCode });
  await db.insert(otps).values({ id: crypto.randomUUID(), userId, email: parsed.data.email, purpose: "verify_email", codeHash: await hashOtp(parsed.data.email, code, environment.authSecret), expiresAt: new Date(Date.now() + 10 * 60_000) });
  const delivery = await sendOtpEmail({ to: parsed.data.email, code, purpose: "verify your email", apiKey: environment.resendApiKey, from: environment.resendFrom });
  return Response.json({ message: "Check your inbox for the verification code.", ...(!delivery.sent && process.env.NODE_ENV !== "production" ? { devCode: code } : {}) }, { status: 201 });
}
