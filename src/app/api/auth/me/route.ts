import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { enforceIdentityRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { countryName } from "@/lib/location";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).refine((value) => !/[\u0000-\u001f\u007f]/.test(value)),
  declaredCountryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
}).refine((value) => !value.declaredCountryCode || countryName(value.declaredCountryCode) !== "Not available", { path: ["declaredCountryCode"] });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null }, { headers: { "cache-control": "no-store" } });
  return Response.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl, role: user.role } }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json({ message: "Sign in to update your profile." }, { status: 401 });
  const guard = await enforceIdentityRateLimit("account.profile", currentUser.id, 20, 3600);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "name") errors.name = "Display name must contain 2 to 80 supported characters.";
      if (issue.path[0] === "declaredCountryCode") errors.declaredCountryCode = "Select a valid country.";
    }
    return Response.json({ message: "Check your profile details.", errors }, { status: 400 });
  }
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Account storage is unavailable." }, { status: 503 });
  const [updated] = await db.update(users).set({ name: parsed.data.name, declaredCountryCode: parsed.data.declaredCountryCode, updatedAt: new Date() }).where(eq(users.id, currentUser.id)).returning({ name: users.name, declaredCountryCode: users.declaredCountryCode });
  if (!updated) return Response.json({ message: "Your account could not be updated." }, { status: 404 });
  return Response.json({ message: "Profile updated.", user: updated });
}
