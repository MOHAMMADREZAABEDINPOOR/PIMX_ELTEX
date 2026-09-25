import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { otps, users } from "@/db/schema";
import { EmailDeliveryError, sendOtpEmail } from "@/lib/email";
import { getEnvironment, verifyTurnstile } from "@/lib/environment";
import { birthDateErrors } from "@/lib/form-validation";
import { getRequestMetadata } from "@/lib/request-metadata";
import { encryptSensitiveValue } from "@/lib/encryption";
import { captchaRequiredResponse, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hashOtp, hashPassword, randomOtp } from "@/lib/security";
import { strongPasswordSchema } from "@/lib/validation";
import { countryName } from "@/lib/location";

const inputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  birthYear: z.string(),
  birthMonth: z.string(),
  birthDay: z.string(),
  declaredCountryCode: z.string().regex(/^[A-Z]{2}$/),
  username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,24}$/),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  password: strongPasswordSchema,
  confirmPassword: z.string().min(1, "Repeat your password."),
  turnstileToken: z.string().optional(),
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
  for (const [field, message] of Object.entries(birthDateErrors(value.birthYear, value.birthMonth, value.birthDay))) {
    context.addIssue({ code: "custom", path: [field], message });
  }
  if (countryName(value.declaredCountryCode) === "Not available") context.addIssue({ code: "custom", path: ["declaredCountryCode"], message: "Select a valid country." });
});

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "auth.signup", 5, 3600);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] || "");
      if (!field || errors[field]) continue;
      errors[field] = field === "password" ? issue.message
        : field === "confirmPassword" || field === "birthYear" || field === "birthMonth" || field === "birthDay" || field === "declaredCountryCode" ? issue.message
        : field === "username" ? "Username must contain 3 to 24 letters, numbers, or underscores."
          : field === "email" ? "Enter a valid email address."
            : field === "name" ? "Display name must contain 2 to 80 characters."
                : "Check this value.";
    }
    return Response.json({ message: "Please check the highlighted fields.", errors }, { status: 400 });
  }
  const environment = await getEnvironment();
  if (process.env.NODE_ENV === "production" && !(await verifyTurnstile(parsed.data.turnstileToken, environment.turnstileSecret))) return captchaRequiredResponse();
  if (process.env.NODE_ENV === "production" && (!environment.smtpUser || !environment.smtpAppPassword)) {
    return Response.json({ message: "Email verification is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  const db = await getDatabase();
  const code = randomOtp();
  if (!db) return Response.json({ message: "Account storage is unavailable." }, { status: 503 });
  let userId: string | undefined;
  let stage: "lookup" | "password" | "user" | "otp" | "email" = "lookup";
  try {
    const existing = await db.select({ id: users.id, email: users.email, username: users.username }).from(users).where(or(eq(users.email, parsed.data.email), eq(users.username, parsed.data.username))).limit(1);
    if (existing.length) {
      const errors: Record<string, string> = {};
      if (existing[0].email === parsed.data.email) errors.email = "An account already uses this email address.";
      if (existing[0].username === parsed.data.username) errors.username = "This username is already taken.";
      return Response.json({ message: "Choose different account details.", errors }, { status: 409 });
    }
    const metadata = await getRequestMetadata(request);
    userId = crypto.randomUUID();
    stage = "password";
    const passwordHash = await hashPassword(parsed.data.password);
    stage = "user";
    const birthDate = `${parsed.data.birthYear}-${parsed.data.birthMonth.padStart(2, "0")}-${parsed.data.birthDay.padStart(2, "0")}`;
    await db.insert(users).values({ id: userId, name: parsed.data.name, birthDateCiphertext: await encryptSensitiveValue(birthDate, environment.authSecret), username: parsed.data.username, email: parsed.data.email, passwordHash, countryCode: metadata.countryCode, declaredCountryCode: parsed.data.declaredCountryCode });
    stage = "otp";
    await db.insert(otps).values({ id: crypto.randomUUID(), userId, email: parsed.data.email, purpose: "verify_email", codeHash: await hashOtp(parsed.data.email, code, environment.authSecret), expiresAt: new Date(Date.now() + 10 * 60_000) });
    stage = "email";
    const delivery = await sendOtpEmail({ to: parsed.data.email, code, purpose: "verify your email", user: environment.smtpUser, appPassword: environment.smtpAppPassword });
    return Response.json({ message: "Check your inbox for the verification code.", ...(!delivery.sent && process.env.NODE_ENV !== "production" ? { devCode: code } : {}) }, { status: 201 });
  } catch (error) {
    console.error("Signup failed", error instanceof Error ? error.message : "Unknown signup error");
    if (userId) {
      await db.delete(otps).where(eq(otps.userId, userId)).catch(() => undefined);
      await db.delete(users).where(eq(users.id, userId)).catch(() => undefined);
    }
    const emailStatus = error instanceof EmailDeliveryError ? error.status
      : error && typeof error === "object" && "name" in error && error.name === "EmailDeliveryError" && "status" in error && typeof error.status === "number" ? error.status
        : undefined;
    if (stage === "email" || emailStatus !== undefined) {
      const message = emailStatus === 535 || emailStatus === 534
        ? "Email sending is not configured correctly. Check the Gmail App Password."
        : emailStatus === 550 || emailStatus === 553
          ? "Gmail rejected the recipient address. Check the email address and try again."
          : "The verification email could not be sent. Please try again later.";
      return Response.json({ message }, { status: 502 });
    }
    const message = stage === "password" ? "Password processing failed. Please try again."
      : stage === "user" || stage === "otp" ? "Account storage failed. Please try again."
        : "Account creation could not be completed. Please try again.";
    return Response.json({ message }, { status: 502 });
  }
}
