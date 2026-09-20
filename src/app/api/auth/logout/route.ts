import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDatabase } from "@/db";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";
import { sessions } from "@/db/schema";
import { sha256 } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const store = await cookies();
  const token = store.get("pimx_session")?.value;
  const db = await getDatabase();
  if (token && db) await db.delete(sessions).where(eq(sessions.tokenHash, await sha256(token)));
  const response = NextResponse.json({ message: "Signed out." });
  response.cookies.set("pimx_session", "", { path: "/", maxAge: 0 });
  return response;
}
