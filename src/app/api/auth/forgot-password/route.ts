import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { otps, users } from "@/db/schema";
import { EmailDeliveryError, sendOtpEmail } from "@/lib/email";
import { getEnvironment, verifyTurnstile } from "@/lib/environment";
import { hashOtp, randomOtp } from "@/lib/security";
import { captchaRequiredResponse, enforceIdentityRateLimit, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const inputSchema = z.object({ email: z.email().transform((value) => value.toLowerCase()), turnstileToken: z.string().optional() });

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "auth.forgot", 5, 3600);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter a valid email address.", errors: { email: "Enter a valid email address." } }, { status: 400 });
  const environment = await getEnvironment();
  if (process.env.NODE_ENV === "production" && !(await verifyTurnstile(parsed.data.turnstileToken, environment.turnstileSecret))) return captchaRequiredResponse();
  const accountGuard = await enforceIdentityRateLimit("auth.forgot.email", parsed.data.email, 3, 3600);
  if (!accountGuard.allowed) return rateLimitResponse(accountGuard.retryAfter);
  if (process.env.NODE_ENV === "production" && (!environment.smtpUser || !environment.smtpAppPassword)) {
    return Response.json({ message: "Password recovery email is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  const db = await getDatabase();
  const code = randomOtp();
  if (!db) return Response.json({ message: "Account storage is unavailable." }, { status: 503 });
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (user) {
    const otpId = crypto.randomUUID();
    try {
      await db.insert(otps).values({ id: otpId, userId: user.id, email: parsed.data.email, purpose: "reset_password", codeHash: await hashOtp(parsed.data.email, code, environment.authSecret), expiresAt: new Date(Date.now() + 10 * 60_000) });
      const delivery = await sendOtpEmail({ to: parsed.data.email, code, purpose: "reset your password", user: environment.smtpUser, appPassword: environment.smtpAppPassword });
      return Response.json({ message: "If an account exists, a recovery code is on its way.", ...(!delivery.sent && process.env.NODE_ENV !== "production" ? { devCode: code } : {}) });
    } catch (error) {
      await db.delete(otps).where(eq(otps.id, otpId)).catch(() => undefined);
      const status = error instanceof EmailDeliveryError ? error.status : 0;
      const message = status === 535 || status === 534
        ? "Email sending is not configured correctly. Check the Gmail App Password."
        : status === 550 || status === 553
          ? "Gmail rejected the recipient address. Check the email address and try again."
          : "The recovery email could not be sent. Please try again.";
      return Response.json({ message }, { status: 502 });
    }
  }
  return Response.json({ message: "If an account exists, a recovery code is on its way." });
}
