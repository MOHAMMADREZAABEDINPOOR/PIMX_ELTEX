import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db";
import { siteVisits, userDevices } from "@/db/schema";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { encryptSensitiveValue } from "@/lib/encryption";
import { getEnvironment } from "@/lib/environment";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRequestMetadata } from "@/lib/request-metadata";
import { randomToken, sha256 } from "@/lib/security";
import { getCurrentUser } from "@/lib/session";

const payloadSchema = z.union([
  z.object({ path: z.string().trim().startsWith("/").max(300) }),
  z.object({ visitId: z.string().uuid(), durationSeconds: z.number().int().min(0).max(86_400) }),
]);

function readCookie(request: Request, name: string) {
  const value = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "analytics.visit", 180, 60);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid analytics payload." }, { status: 400 });
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Analytics storage is unavailable." }, { status: 503 });

  const existingVisitorToken = readCookie(request, "pimx_visitor");
  const visitorToken = existingVisitorToken || randomToken();
  const visitorHash = await sha256(visitorToken);

  if ("visitId" in parsed.data) {
    const [visit] = await db.select({ durationSeconds: siteVisits.durationSeconds, userId: siteVisits.userId }).from(siteVisits).where(and(eq(siteVisits.id, parsed.data.visitId), eq(siteVisits.visitorHash, visitorHash))).limit(1);
    if (!visit) return Response.json({ message: "Visit not found." }, { status: 404 });
    const nextDuration = Math.max(visit.durationSeconds, parsed.data.durationSeconds);
    const delta = nextDuration - visit.durationSeconds;
    const now = new Date();
    await db.update(siteVisits).set({ durationSeconds: nextDuration, lastSeenAt: now }).where(eq(siteVisits.id, parsed.data.visitId));
    if (visit.userId && delta > 0) {
      const metadata = await getRequestMetadata(request);
      await db.update(userDevices).set({ totalDurationSeconds: sql`${userDevices.totalDurationSeconds} + ${delta}`, lastSeenAt: now }).where(and(eq(userDevices.userId, visit.userId), eq(userDevices.fingerprintHash, metadata.fingerprint)));
    }
    return Response.json({ visitId: parsed.data.visitId, durationSeconds: nextDuration });
  }

  const [metadata, user, environment] = await Promise.all([getRequestMetadata(request), getCurrentUser(), getEnvironment()]);
  const ipAddressCiphertext = metadata.ipAddress ? await encryptSensitiveValue(metadata.ipAddress, environment.authSecret) : null;
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(siteVisits).values({ id, visitorHash, userId: user?.id || null, path: parsed.data.path, countryCode: metadata.countryCode, city: metadata.city, region: metadata.region, deviceType: metadata.deviceType, operatingSystem: metadata.operatingSystem, browser: metadata.browser, ipAddressCiphertext });
  if (user) {
    await db.insert(userDevices).values({ id: crypto.randomUUID(), userId: user.id, fingerprintHash: metadata.fingerprint, countryCode: metadata.countryCode, city: metadata.city, region: metadata.region, ipAddressCiphertext, deviceType: metadata.deviceType, operatingSystem: metadata.operatingSystem, browser: metadata.browser, visitCount: 1 }).onConflictDoUpdate({ target: [userDevices.userId, userDevices.fingerprintHash], set: { countryCode: metadata.countryCode, city: metadata.city, region: metadata.region, ipAddressCiphertext, deviceType: metadata.deviceType, operatingSystem: metadata.operatingSystem, browser: metadata.browser, lastSeenAt: now, visitCount: sql`${userDevices.visitCount} + 1` } });
  }
  const response = NextResponse.json({ visitId: id }, { status: 201 });
  if (!existingVisitorToken) response.cookies.set("pimx_visitor", visitorToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 365 * 86_400, priority: "medium" });
  return response;
}
