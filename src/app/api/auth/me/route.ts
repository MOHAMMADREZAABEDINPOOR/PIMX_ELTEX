import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null }, { headers: { "cache-control": "no-store" } });
  return Response.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl, role: user.role } }, { headers: { "cache-control": "no-store" } });
}
