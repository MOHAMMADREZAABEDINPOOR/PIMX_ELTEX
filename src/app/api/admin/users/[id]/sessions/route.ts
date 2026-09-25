import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { auditLogs, sessions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { effectiveAdminPermissions, hasAdminPermission } from "@/lib/admin-permissions";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin("members.sessions");
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });
  const { id } = await params;
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [member] = await db.select({ id: users.id, role: users.role, adminPermissions: users.adminPermissions }).from(users).where(eq(users.id, id)).limit(1);
  if (!member) return Response.json({ message: "Member not found." }, { status: 404 });
  if (member.role === "admin" && id !== admin.id && (!hasAdminPermission(admin, "members.roles") || effectiveAdminPermissions(member).some((permission) => !effectiveAdminPermissions(admin).includes(permission)))) return Response.json({ message: "You cannot revoke this administrator's sessions." }, { status: 403 });
  const revoked = await db.delete(sessions).where(eq(sessions.userId, id)).returning({ id: sessions.id });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: admin.id, action: "user.sessions.revoke", targetType: "user", targetId: id, metadata: { count: revoked.length } });
  return Response.json({ revoked: revoked.length });
}
