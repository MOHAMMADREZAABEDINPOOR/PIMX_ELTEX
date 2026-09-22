import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { sessions, userDevices, users } from "@/db/schema";
import { getEnvironment, verifyTurnstile } from "@/lib/environment";
import { getRequestMetadata } from "@/lib/request-metadata";
import { encryptSensitiveValue } from "@/lib/encryption";
import { captchaRequiredResponse, enforceIdentityRateLimit, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hashPassword, passwordNeedsUpgrade, randomToken, sha256, verifyPassword } from "@/lib/security";

const inputSchema = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), password: z.string().min(8).max(128), turnstileToken: z.string().optional() });

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "auth.login", 10, 900);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid email or password." }, { status: 401 });
  const accountGuard = await enforceIdentityRateLimit("auth.login.account", parsed.data.email, 20, 3600);
  if (!accountGuard.allowed) return rateLimitResponse(accountGuard.retryAfter);
  const environment = await getEnvironment();
  if (process.env.NODE_ENV === "production" && !(await verifyTurnstile(parsed.data.turnstileToken, environment.turnstileSecret))) return captchaRequiredResponse();
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user || user.status !== "active" || !user.emailVerifiedAt || !(await verifyPassword(parsed.data.password, user.passwordHash))) return Response.json({ message: "Invalid email or password." }, { status: 401 });
  if (passwordNeedsUpgrade(user.passwordHash)) await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: new Date() }).where(and(eq(users.id, user.id), eq(users.passwordHash, user.passwordHash)));
  const metadata = await getRequestMetadata(request);
  const token = randomToken();
  const now = new Date();
  const ipAddressCiphertext = metadata.ipAddress ? await encryptSensitiveValue(metadata.ipAddress, environment.authSecret) : null;
  await db.insert(sessions).values({ id: crypto.randomUUID(), userId: user.id, tokenHash: await sha256(token), expiresAt: new Date(Date.now() + 30 * 86_400_000), countryCode: metadata.countryCode, city: metadata.city, region: metadata.region, ipAddressCiphertext, deviceType: metadata.deviceType, operatingSystem: metadata.operatingSystem, browser: metadata.browser });
  await db.update(users).set({ lastLoginAt: now, updatedAt: now }).where(eq(users.id, user.id));
  await db.insert(userDevices).values({ id: crypto.randomUUID(), userId: user.id, fingerprintHash: metadata.fingerprint, countryCode: metadata.countryCode, city: metadata.city, region: metadata.region, ipAddressCiphertext, deviceType: metadata.deviceType, operatingSystem: metadata.operatingSystem, browser: metadata.browser }).onConflictDoUpdate({ target: [userDevices.userId, userDevices.fingerprintHash], set: { lastSeenAt: now, countryCode: metadata.countryCode, city: metadata.city, region: metadata.region, ipAddressCiphertext, deviceType: metadata.deviceType, operatingSystem: metadata.operatingSystem, browser: metadata.browser } });
  const response = NextResponse.json({ message: "Welcome back.", user: { name: user.name, role: user.role } });
  response.cookies.set("pimx_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86_400, priority: "high" });
  return response;
}
