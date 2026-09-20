import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { otps, users } from "@/db/schema";
import { sendOtpEmail } from "@/lib/email";
import { getEnvironment, verifyTurnstile } from "@/lib/environment";
import { hashOtp, randomOtp } from "@/lib/security";
import { captchaRequiredResponse, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const inputSchema = z.object({ email: z.email().transform((value) => value.toLowerCase()), turnstileToken: z.string().optional() });

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "auth.forgot", 5, 3600);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  const environment = await getEnvironment();
  if (guard.count > 1 && !(await verifyTurnstile(parsed.data.turnstileToken, environment.turnstileSecret))) return captchaRequiredResponse();
  if (process.env.NODE_ENV === "production" && (!environment.resendApiKey || !environment.resendFrom)) {
    return Response.json({ message: "Password recovery email is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  const db = await getDatabase();
  const code = randomOtp();
  if (!db) return Response.json({ message: "Account storage is unavailable." }, { status: 503 });
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (user) {
    await db.insert(otps).values({ id: crypto.randomUUID(), userId: user.id, email: parsed.data.email, purpose: "reset_password", codeHash: await hashOtp(parsed.data.email, code, environment.authSecret), expiresAt: new Date(Date.now() + 10 * 60_000) });
    const delivery = await sendOtpEmail({ to: parsed.data.email, code, purpose: "reset your password", apiKey: environment.resendApiKey, from: environment.resendFrom });
    return Response.json({ message: "If an account exists, a recovery code is on its way.", ...(!delivery.sent && process.env.NODE_ENV !== "production" ? { devCode: code } : {}) });
  }
  return Response.json({ message: "If an account exists, a recovery code is on its way." });
}
