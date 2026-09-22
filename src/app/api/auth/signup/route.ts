import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { otps, users } from "@/db/schema";
import { EmailDeliveryError, sendOtpEmail } from "@/lib/email";
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
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const message = field === "password" ? issue.message
      : field === "username" ? "Username must contain 3 to 24 letters, numbers, or underscores."
        : field === "email" ? "Enter a valid email address."
          : field === "age" ? "Age must be between 13 and 120."
            : field === "name" ? "Display name must contain 2 to 80 characters."
              : "Please check the information you entered.";
    return Response.json({ message }, { status: 400 });
  }
  const environment = await getEnvironment();
  if (process.env.NODE_ENV === "production" && !(await verifyTurnstile(parsed.data.turnstileToken, environment.turnstileSecret))) return captchaRequiredResponse();
  if (process.env.NODE_ENV === "production" && (!environment.resendApiKey || !environment.resendFrom)) {
    return Response.json({ message: "Email verification is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  const db = await getDatabase();
  const code = randomOtp();
  if (!db) return Response.json({ message: "Account storage is unavailable." }, { status: 503 });
  let userId: string | undefined;
  try {
    const existing = await db.select({ id: users.id }).from(users).where(or(eq(users.email, parsed.data.email), eq(users.username, parsed.data.username))).limit(1);
    if (existing.length) return Response.json({ message: "An account with these details already exists." }, { status: 409 });
    const metadata = await getRequestMetadata(request);
    userId = crypto.randomUUID();
    await db.insert(users).values({ id: userId, name: parsed.data.name, age: parsed.data.age, username: parsed.data.username, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), countryCode: metadata.countryCode });
    await db.insert(otps).values({ id: crypto.randomUUID(), userId, email: parsed.data.email, purpose: "verify_email", codeHash: await hashOtp(parsed.data.email, code, environment.authSecret), expiresAt: new Date(Date.now() + 10 * 60_000) });
    const delivery = await sendOtpEmail({ to: parsed.data.email, code, purpose: "verify your email", apiKey: environment.resendApiKey, from: environment.resendFrom });
    return Response.json({ message: "Check your inbox for the verification code.", ...(!delivery.sent && process.env.NODE_ENV !== "production" ? { devCode: code } : {}) }, { status: 201 });
  } catch (error) {
    console.error("Signup failed", error instanceof Error ? error.message : "Unknown signup error");
    if (userId) {
      await db.delete(otps).where(eq(otps.userId, userId)).catch(() => undefined);
      await db.delete(users).where(eq(users.id, userId)).catch(() => undefined);
    }
    if (error instanceof EmailDeliveryError) {
      const message = error.status === 401 || error.status === 403
        ? "Email service credentials are invalid. Update the Resend API key and try again."
        : error.status === 422
          ? "The email sender domain is not verified in Resend. Verify the domain and try again."
          : "The verification email could not be sent. Please try again.";
      return Response.json({ message }, { status: 502 });
    }
    return Response.json({ message: "Account creation could not be completed. Please try again." }, { status: 502 });
  }
}
