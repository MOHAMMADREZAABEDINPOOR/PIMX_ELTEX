import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { auditLogs, comments, posts, sessions, siteVisits, userDevices, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { decryptSensitiveValue } from "@/lib/encryption";
import { getEnvironment } from "@/lib/environment";
import { sessionIsActive } from "@/lib/session-policy";
import { effectiveAdminPermissions, hasAdminPermission } from "@/lib/admin-permissions";

const updateSchema = z.object({ status: z.enum(["active", "blocked"]) });
type Context = { params: Promise<{ id: string }> };

async function revealIp(value: string | null, secret: string) {
  if (!value) return "Not recorded";
  try { return await decryptSensitiveValue(value, secret); } catch { return "Unavailable"; }
}

export async function GET(_request: Request, { params }: Context) {
  const admin = await requireAdmin("members.view");
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const { id } = await params;
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [[member], devices, loginSessions, recentVisits, recentComments, [totals], [commentTotals], environment] = await Promise.all([
    db.select({ id: users.id, name: users.name, username: users.username, bio: users.bio, birthDateCiphertext: users.birthDateCiphertext, email: users.email, countryCode: users.countryCode, declaredCountryCode: users.declaredCountryCode, role: users.role, adminPermissions: users.adminPermissions, status: users.status, emailVerifiedAt: users.emailVerifiedAt, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt }).from(users).where(eq(users.id, id)).limit(1),
    db.select({ id: userDevices.id, countryCode: userDevices.countryCode, city: userDevices.city, region: userDevices.region, deviceType: userDevices.deviceType, operatingSystem: userDevices.operatingSystem, browser: userDevices.browser, ipAddressCiphertext: userDevices.ipAddressCiphertext, visitCount: userDevices.visitCount, totalDurationSeconds: userDevices.totalDurationSeconds, createdAt: userDevices.createdAt, lastSeenAt: userDevices.lastSeenAt }).from(userDevices).where(eq(userDevices.userId, id)).orderBy(desc(userDevices.lastSeenAt)).limit(50),
    db.select({ id: sessions.id, countryCode: sessions.countryCode, city: sessions.city, region: sessions.region, deviceType: sessions.deviceType, operatingSystem: sessions.operatingSystem, browser: sessions.browser, ipAddressCiphertext: sessions.ipAddressCiphertext, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, expiresAt: sessions.expiresAt }).from(sessions).where(eq(sessions.userId, id)).orderBy(desc(sessions.lastSeenAt)).limit(30),
    db.select({ id: siteVisits.id, path: siteVisits.path, countryCode: siteVisits.countryCode, city: siteVisits.city, deviceType: siteVisits.deviceType, browser: siteVisits.browser, durationSeconds: siteVisits.durationSeconds, createdAt: siteVisits.createdAt }).from(siteVisits).where(eq(siteVisits.userId, id)).orderBy(desc(siteVisits.createdAt)).limit(50),
    db.select({ id: comments.id, content: comments.content, createdAt: comments.createdAt, postTitle: posts.title, postSlug: posts.slug }).from(comments).innerJoin(posts, eq(posts.id, comments.postId)).where(and(eq(comments.authorId, id), eq(comments.status, "visible"))).orderBy(desc(comments.createdAt)).limit(10),
    db.select({ visits: sql<number>`count(*)`, durationSeconds: sql<number>`coalesce(sum(${siteVisits.durationSeconds}), 0)` }).from(siteVisits).where(eq(siteVisits.userId, id)),
    db.select({ count: sql<number>`count(*)` }).from(comments).where(and(eq(comments.authorId, id), eq(comments.status, "visible"))),
    getEnvironment(),
  ]);
  if (!member) return Response.json({ message: "Member not found." }, { status: 404 });
  const activeSessions = loginSessions.filter((session) => sessionIsActive(session, member.role));
  const { birthDateCiphertext, ...memberDetails } = member;
  const birthDate = birthDateCiphertext ? await decryptSensitiveValue(birthDateCiphertext, environment.authSecret).catch(() => null) : null;
  const country = devices.find((device) => device.countryCode)?.countryCode || member.countryCode || "";
  return Response.json({ member: { ...memberDetails, country, birthDate }, totals: { visits: Number(totals?.visits || 0), durationSeconds: Number(totals?.durationSeconds || 0), comments: Number(commentTotals?.count || 0) }, devices: await Promise.all(devices.map(async ({ ipAddressCiphertext, ...device }) => ({ ...device, ipAddress: await revealIp(ipAddressCiphertext, environment.authSecret) }))), sessions: await Promise.all(activeSessions.map(async ({ ipAddressCiphertext, ...session }) => ({ ...session, ipAddress: await revealIp(ipAddressCiphertext, environment.authSecret) }))), recentVisits, recentComments }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin("members.block");
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid account status." }, { status: 400 });
  const { id } = await params;
  if (id === admin.id) return Response.json({ message: "You cannot block your own account." }, { status: 400 });
  const db = await getDatabase(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [target] = await db.select({ role: users.role, adminPermissions: users.adminPermissions }).from(users).where(eq(users.id, id)).limit(1);
  if (target?.role === "admin" && (!hasAdminPermission(admin, "members.roles") || effectiveAdminPermissions(target).some((permission) => !effectiveAdminPermissions(admin).includes(permission)))) return Response.json({ message: "You cannot change this administrator." }, { status: 403 });
  const updated = await db.update(users).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(users.id, id)).returning({ id: users.id });
  if (!updated.length) return Response.json({ message: "Member not found." }, { status: 404 });
  if (parsed.data.status === "blocked") await db.delete(sessions).where(eq(sessions.userId, id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: `user.${parsed.data.status}`, targetType: "user", targetId: id });
  return Response.json({ id, status: parsed.data.status });
}

export async function DELETE(request: Request, { params }: Context) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin("members.delete");
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const { id } = await params;
  if (id === admin.id) return Response.json({ message: "You cannot delete your own account." }, { status: 400 });
  const db = await getDatabase(); if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [target] = await db.select({ role: users.role, adminPermissions: users.adminPermissions }).from(users).where(eq(users.id, id)).limit(1);
  if (target?.role === "admin" && (!hasAdminPermission(admin, "members.roles") || effectiveAdminPermissions(target).some((permission) => !effectiveAdminPermissions(admin).includes(permission)))) return Response.json({ message: "You cannot delete this administrator." }, { status: 403 });
  const deleted = await db.update(users).set({ status: "deleted", role: "user", adminPermissions: null, name: "Deleted member", email: `deleted-${id}@invalid.local`, username: `deleted_${id}`, passwordHash: "disabled", avatarUrl: null, bio: null, birthDateCiphertext: null, updatedAt: new Date() }).where(eq(users.id, id)).returning({ id: users.id });
  if (!deleted.length) return Response.json({ message: "Member not found." }, { status: 404 });
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "user.delete", targetType: "user", targetId: id });
  return Response.json({ id });
}
