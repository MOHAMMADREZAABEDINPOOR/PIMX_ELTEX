import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionCookieOptions, sessionIsActive, sessionPolicy, shouldTouchSession } from "../src/lib/session-policy.ts";

const now = Date.UTC(2026, 8, 24, 12);
const hoursAgo = (hours) => new Date(now - hours * 3_600_000);
const hoursAhead = (hours) => new Date(now + hours * 3_600_000);

test("member sessions have both idle and absolute expiration", () => {
  const active = { createdAt: hoursAgo(24), lastSeenAt: hoursAgo(2), expiresAt: hoursAhead(144) };
  assert.equal(sessionIsActive(active, "user", now), true);
  assert.equal(sessionIsActive({ ...active, lastSeenAt: hoursAgo(12) }, "user", now), false);
  assert.equal(sessionIsActive({ ...active, createdAt: hoursAgo(168) }, "user", now), false);
  assert.equal(sessionIsActive({ ...active, expiresAt: hoursAgo(1) }, "user", now), false);
});

test("admin sessions expire sooner even after an account is promoted", () => {
  const session = { createdAt: hoursAgo(2), lastSeenAt: hoursAgo(0.4), expiresAt: hoursAhead(100) };
  assert.equal(sessionIsActive(session, "admin", now), true);
  assert.equal(sessionIsActive({ ...session, lastSeenAt: hoursAgo(0.5) }, "admin", now), false);
  assert.equal(sessionIsActive({ ...session, createdAt: hoursAgo(8) }, "admin", now), false);
  assert.equal(sessionCookieOptions("admin").maxAge, sessionPolicy("admin").absoluteSeconds);
});

test("activity writes are throttled", () => {
  assert.equal(shouldTouchSession(new Date(now - 4 * 60_000), "admin", now), false);
  assert.equal(shouldTouchSession(new Date(now - 5 * 60_000), "admin", now), true);
  assert.equal(shouldTouchSession(new Date(now - 15 * 60_000), "user", now), true);
});
