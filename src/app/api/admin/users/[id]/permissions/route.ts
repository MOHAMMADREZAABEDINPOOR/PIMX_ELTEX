import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { auditLogs, sessions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { adminPermissionKeys, effectiveAdminPermissions } from "@/lib/admin-permissions";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";

const inputSchema = z.object({ role: z.enum(["user", "admin"]), permissions: z.array(z.enum(adminPermissionKeys)).max(adminPermissionKeys.length) }).refine((value) => new Set(value.permissions).size === value.permissions.length);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const actor = await requireAdmin("members.roles");
  if (!actor) return Response.json({ message: "Role management access required." }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Select a valid role and permissions." }, { status: 400 });
  const { id } = await params;
  if (id === actor.id) return Response.json({ message: "You cannot change your own administrator access." }, { status: 400 });
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Database is not available." }, { status: 503 });
  const [target] = await db.select({ id: users.id, role: users.role, status: users.status, emailVerifiedAt: users.emailVerifiedAt, adminPermissions: users.adminPermissions }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return Response.json({ message: "Member not found." }, { status: 404 });
  if (target.status !== "active" || !target.emailVerifiedAt) return Response.json({ message: "Only active, verified members can be assigned roles." }, { status: 400 });
  const allowed = new Set(effectiveAdminPermissions(actor));
  if (target.role === "admin" && effectiveAdminPermissions(target).some((permission) => !allowed.has(permission))) return Response.json({ message: "You cannot change an administrator with permissions above yours." }, { status: 403 });
  if (parsed.data.role === "admin" && parsed.data.permissions.some((permission) => !allowed.has(permission))) return Response.json({ message: "You cannot grant permissions you do not hold." }, { status: 403 });
  const permissions = parsed.data.role === "admin" ? parsed.data.permissions : null;
  await db.update(users).set({ role: parsed.data.role, adminPermissions: permissions, updatedAt: new Date() }).where(eq(users.id, id));
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: actor.id, action: "user.role.update", targetType: "user", targetId: id, metadata: { role: parsed.data.role, permissions: permissions || [] } });
  return Response.json({ id, role: parsed.data.role, adminPermissions: permissions });
}
