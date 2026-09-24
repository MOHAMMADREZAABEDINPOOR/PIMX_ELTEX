export const SESSION_COOKIE_NAME = "pimx_session";

const memberPolicy = { absoluteSeconds: 7 * 86_400, idleSeconds: 12 * 3_600, touchSeconds: 15 * 60 };
const adminPolicy = { absoluteSeconds: 8 * 3_600, idleSeconds: 30 * 60, touchSeconds: 5 * 60 };

export function sessionPolicy(role: string) {
  return role === "admin" ? adminPolicy : memberPolicy;
}

export function sessionIsActive(
  session: { createdAt: Date; lastSeenAt: Date; expiresAt: Date },
  role: string,
  now = Date.now(),
) {
  const policy = sessionPolicy(role);
  const absoluteExpiry = Math.min(session.expiresAt.getTime(), session.createdAt.getTime() + policy.absoluteSeconds * 1_000);
  return now >= session.createdAt.getTime()
    && now < absoluteExpiry
    && now < session.lastSeenAt.getTime() + policy.idleSeconds * 1_000;
}

export function shouldTouchSession(lastSeenAt: Date, role: string, now = Date.now()) {
  return now - lastSeenAt.getTime() >= sessionPolicy(role).touchSeconds * 1_000;
}

export function sessionCookieOptions(role: string) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionPolicy(role).absoluteSeconds, priority: "high" as const };
}

export function expiredSessionCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0, priority: "high" as const };
}
