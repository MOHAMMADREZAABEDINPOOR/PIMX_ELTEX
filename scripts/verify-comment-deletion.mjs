const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const password = process.env.TEST_ADMIN_PASSWORD;
if (!password) throw new Error("Set TEST_ADMIN_PASSWORD before running the comment deletion regression test.");

const slug = "muse-spark-1-3-original-3d-platformer";
const marker = `Permanent deletion regression ${Date.now()}`;

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email: "admin@pimx-eltex.local", password, turnstileToken: "" }),
});
if (!login.ok) throw new Error(`Login failed with ${login.status}: ${await login.text()}`);
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not return a session cookie.");
const headers = { cookie, origin: baseUrl, "content-type": "application/json" };

async function createComment(content, parentId = null) {
  const response = await fetch(`${baseUrl}/api/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ postSlug: slug, parentId, content, turnstileToken: "" }),
  });
  const result = await response.json();
  if (!response.ok || !result.id) throw new Error(`Comment creation failed (${response.status}): ${JSON.stringify(result)}`);
  return result.id;
}

function containsComment(nodes, id) {
  return nodes.some((node) => node.id === id || containsComment(node.replies || [], id));
}

async function loadDiscussion() {
  const response = await fetch(`${baseUrl}/api/comments?post=${slug}`, { headers });
  const result = await response.json();
  if (!response.ok) throw new Error(`Discussion fetch failed (${response.status}): ${JSON.stringify(result)}`);
  return result.comments || [];
}

const parentId = await createComment(marker);
const replyId = await createComment(`${marker} reply`, parentId);
const before = await loadDiscussion();
if (!containsComment(before, parentId) || !containsComment(before, replyId)) throw new Error("The test comment thread was not visible before deletion.");

const deletion = await fetch(`${baseUrl}/api/comments/${parentId}`, { method: "DELETE", headers });
if (!deletion.ok) throw new Error(`Deletion failed (${deletion.status}): ${await deletion.text()}`);

const after = await loadDiscussion();
if (containsComment(after, parentId) || containsComment(after, replyId)) throw new Error("Deleted comment thread is still visible.");
console.log(JSON.stringify({ ok: true, parentId, replyId, marker }));
