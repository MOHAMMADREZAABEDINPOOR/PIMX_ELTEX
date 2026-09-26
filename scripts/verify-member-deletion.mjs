import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";

// This test creates disposable fixtures exclusively in the local D1 database.
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3001";
const url = new URL(baseUrl);
assert(["localhost", "127.0.0.1"].includes(url.hostname), "Only a local test server is allowed.");
const marker = `member-delete-${randomUUID()}`;
const adminId = `${marker}-admin`;
const memberId = `${marker}-member`;
const restrictedId = `${marker}-restricted`;
const postId = `${marker}-post`;
const commentId = `${marker}-comment`;
const token = randomUUID();
const restrictedToken = randomUUID();
const memberToken = randomUUID();
const hash = (value) => createHash("sha256").update(value).digest("base64url");
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
function sql(command) {
  const output = execFileSync(process.execPath, [join(process.cwd(), "node_modules/wrangler/bin/wrangler.js"), "d1", "execute", "pimx-eltex-db", "--local", "--json", "--command", command], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(output).flatMap((result) => result.results || []);
}
async function remove(id, cookieToken = token, origin = baseUrl) {
  return fetch(`${baseUrl}/api/admin/users/${id}`, { method: "DELETE", headers: { cookie: `pimx_session=${cookieToken}`, origin } });
}

try {
  sql(`
    INSERT INTO users (id,name,username,email,password_hash,role,admin_permissions,email_verified_at) VALUES
      (${quote(adminId)},'Deletion test admin',${quote(adminId)},${quote(`${adminId}@example.invalid`)},'disabled','admin',NULL,unixepoch()),
      (${quote(memberId)},'Deletion test member',${quote(memberId)},${quote(`${memberId}@example.invalid`)},'disabled','user',NULL,unixepoch()),
      (${quote(restrictedId)},'Restricted admin',${quote(restrictedId)},${quote(`${restrictedId}@example.invalid`)},'disabled','admin','["members.view"]',unixepoch());
    INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES
      (${quote(`${marker}-session-admin`)},${quote(adminId)},${quote(hash(token))},unixepoch()+3600),
      (${quote(`${marker}-session-member`)},${quote(memberId)},${quote(hash(memberToken))},unixepoch()+3600),
      (${quote(`${marker}-session-restricted`)},${quote(restrictedId)},${quote(hash(restrictedToken))},unixepoch()+3600);
    INSERT INTO posts (id,author_id,slug,title,excerpt,content,category) VALUES (${quote(postId)},${quote(memberId)},${quote(postId)},'Deletion regression','Test','Test','Test');
    INSERT INTO comments (id,post_id,author_id,content) VALUES (${quote(commentId)},${quote(postId)},${quote(memberId)},'Deletion regression');
    INSERT INTO comment_likes (comment_id,user_id) VALUES (${quote(commentId)},${quote(memberId)});
    INSERT INTO user_devices (id,user_id,fingerprint_hash) VALUES (${quote(`${marker}-device`)},${quote(memberId)},${quote(marker)});
    INSERT INTO site_visits (id,visitor_hash,user_id,path) VALUES (${quote(`${marker}-visit`)},${quote(marker)},${quote(memberId)},'/account');
    INSERT INTO otps (id,user_id,email,purpose,code_hash,expires_at) VALUES (${quote(`${marker}-otp`)},${quote(memberId)},${quote(`${memberId}@example.invalid`)},'verify_email','disabled',unixepoch()+3600);
  `);
  assert.equal((await remove(memberId, restrictedToken)).status, 403, "Administrator without deletion permission must be denied.");
  assert.equal((await remove(memberId, token, "https://example.invalid")).status, 403, "Cross-origin deletion must be denied.");
  assert.equal((await remove(adminId)).status, 400, "Self-deletion must be denied.");
  assert.equal((await remove(memberId)).status, 200, "Member deletion should succeed.");
  assert.equal(sql(`SELECT count(*) AS remaining FROM users WHERE id=${quote(memberId)}`)[0].remaining, 0, "Deleted member must be absent from D1, not anonymized.");
  for (const [table, column] of [["sessions", "user_id"], ["otps", "user_id"], ["comments", "author_id"], ["comment_likes", "user_id"], ["user_devices", "user_id"], ["site_visits", "user_id"]]) {
    assert.equal(sql(`SELECT count(*) AS remaining FROM ${table} WHERE ${column}=${quote(memberId)}`)[0].remaining, 0, `${table} must be removed.`);
  }
  assert.equal(sql(`SELECT count(*) AS remaining FROM site_visits WHERE id=${quote(`${marker}-visit`)}`)[0].remaining, 0, "Personal analytics must be deleted, not detached.");
  assert.equal(sql(`SELECT author_id FROM posts WHERE id=${quote(postId)}`)[0].author_id, adminId, "Published content must survive with the deleting administrator as author.");
  assert.equal(sql(`SELECT count(*) AS total FROM audit_logs WHERE target_id=${quote(memberId)} AND action='user.delete'`)[0].total, 1, "Deletion must be audited.");
  assert.equal((await remove(memberId)).status, 404, "A deleted member must no longer be found.");
  const detail = await fetch(`${baseUrl}/api/admin/users/${memberId}`, { headers: { cookie: `pimx_session=${token}` } });
  assert.equal(detail.status, 404, "Member details must disappear too.");
  const account = await fetch(`${baseUrl}/api/auth/me`, { method: "PATCH", headers: { cookie: `pimx_session=${memberToken}`, origin: baseUrl, "content-type": "application/json" }, body: JSON.stringify({ name: "Should be denied", declaredCountryCode: null }) });
  assert.equal(account.status, 401, "Deleted member's session must no longer authorize account access.");
  console.log("PASS: permanent member deletion, related data removal, content preservation, authorization and session invalidation.");
} finally {
  sql(`DELETE FROM posts WHERE id=${quote(postId)}; DELETE FROM site_visits WHERE visitor_hash=${quote(marker)}; DELETE FROM users WHERE id IN (${quote(adminId)},${quote(memberId)},${quote(restrictedId)}); DELETE FROM audit_logs WHERE target_id=${quote(memberId)};`);
}
