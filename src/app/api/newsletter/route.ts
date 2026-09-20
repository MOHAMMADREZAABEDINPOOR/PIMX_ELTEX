import { z } from "zod";
import { getDatabase } from "@/db";
import { newsletterSubscriptions } from "@/db/schema";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { encryptSensitiveValue } from "@/lib/encryption";
import { getEnvironment } from "@/lib/environment";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sha256 } from "@/lib/security";

const inputSchema = z.object({ email: z.email().max(254).transform((value) => value.trim().toLowerCase()), website: z.string().max(0).optional() });

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const guard = await enforceRateLimit(request, "newsletter.subscribe", 5, 3600);
  if (!guard.allowed) return rateLimitResponse(guard.retryAfter);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  const db = await getDatabase();
  if (!db) return Response.json({ message: "Subscription storage is unavailable." }, { status: 503 });
  const { authSecret } = await getEnvironment();
  const emailHash = await sha256(parsed.data.email);
  await db.insert(newsletterSubscriptions).values({ id: crypto.randomUUID(), emailHash, emailCiphertext: await encryptSensitiveValue(parsed.data.email, authSecret) }).onConflictDoUpdate({ target: newsletterSubscriptions.emailHash, set: { status: "active" } });
  return Response.json({ message: "You are on the list." }, { status: 201 });
}
