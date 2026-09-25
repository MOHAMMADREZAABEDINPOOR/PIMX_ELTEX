import "server-only";
import { getCurrentUser } from "./session";
import { hasAdminPermission, type AdminPermission } from "./admin-permissions";

export async function requireAdmin(permission?: AdminPermission) {
  const user = await getCurrentUser();
  return user?.role === "admin" && (!permission || hasAdminPermission(user, permission)) ? user : null;
}
