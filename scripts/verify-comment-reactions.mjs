const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const password = process.env.TEST_ADMIN_PASSWORD;
if (!password) throw new Error("Set TEST_ADMIN_PASSWORD before running the reaction regression test.");

const login = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email: "admin@pimx-eltex.local", password, turnstileToken: "" }) });
if (!login.ok) throw new Error(`Login failed with ${login.status}: ${await login.text()}`);
const cookie = login.headers.get("set-cookie")?.split(";")[0];
if (!cookie) throw new Error("Login did not return a session cookie.");
const headers = { cookie, origin: baseUrl, "content-type": "application/json" };
const slug = "muse-spark-1-3-original-3d-platformer";

let discussion = await fetch(`${baseUrl}/api/comments?post=${slug}`, { headers }).then((response) => response.json());
let commentId = discussion.comments?.[0]?.id;
if (!commentId) {
  const created = await fetch(`${baseUrl}/api/comments`, { method: "POST", headers, body: JSON.stringify({ postSlug: slug, content: "Reaction regression test comment", turnstileToken: "" }) });
  const result = await created.json();
  if (!created.ok || !result.id) throw new Error(`Could not create test comment: ${JSON.stringify(result)}`);
  commentId = result.id;
}

async function react(reaction) {
  const response = await fetch(`${baseUrl}/api/comments/${commentId}/like`, { method: "POST", headers, body: JSON.stringify({ reaction }) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { throw new Error(`Reaction returned non-JSON (${response.status}): ${text}`); }
  if (!response.ok) throw new Error(`Reaction failed (${response.status}): ${text}`);
  return body;
}

const current = await react("like");
if (current.reaction !== 0) await react("like");
const liked = await react("like");
const unliked = await react("like");
const disliked = await react("dislike");
const switched = await react("like");
if (liked.reaction !== 1 || unliked.reaction !== 0 || disliked.reaction !== -1 || switched.reaction !== 1) throw new Error(`Unexpected toggle sequence: ${JSON.stringify({ liked, unliked, disliked, switched })}`);
const rapid = await Promise.all([react("like"), react("like")]);
console.log(JSON.stringify({ ok: true, commentId, sequence: [liked.reaction, unliked.reaction, disliked.reaction, switched.reaction], rapidStatuses: rapid.map((result) => result.reaction) }));
