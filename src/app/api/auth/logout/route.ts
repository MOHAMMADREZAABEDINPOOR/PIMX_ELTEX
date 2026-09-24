import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { sessions } from "@/db/schema";
import { sha256 } from "@/lib/security";
import { expiredSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session-policy";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const db = await getDatabase();
    if (!db) return Response.json({ message: "Sign out is temporarily unavailable. Please try again." }, { status: 503 });
    try {
      await db.delete(sessions).where(eq(sessions.tokenHash, await sha256(token)));
    } catch {
      return Response.json({ message: "Sign out is temporarily unavailable. Please try again." }, { status: 503 });
    }
  }
  const response = NextResponse.json({ message: "Signed out." });
  response.cookies.set(SESSION_COOKIE_NAME, "", expiredSessionCookieOptions());
  return response;
}
