import "server-only";
import { getCurrentUser } from "./session";

export async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
