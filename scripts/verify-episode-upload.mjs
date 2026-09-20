import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { zipSync } from "fflate";

const password = process.env.TEST_ADMIN_PASSWORD;
if (!password) throw new Error("Set TEST_ADMIN_PASSWORD before running this verification.");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const folder = join(process.cwd(), "muse spark 1.3", "prompt 6");
const sourceNames = ["index.html", "script.js", "styles.css"];
const sources = Object.fromEntries(await Promise.all(sourceNames.map(async (name) => [name, new Uint8Array(await readFile(join(folder, name)))])));
const archive = zipSync(sources, { level: 6 });

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email: "admin@pimx-eltex.local", password, turnstileToken: "" }),
});
if (!login.ok) throw new Error(`Login failed with ${login.status}.`);
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not create a session cookie.");

const form = new FormData();
for (const name of sourceNames) {
  const type = name.endsWith(".html") ? "text/html" : name.endsWith(".css") ? "text/css" : "text/javascript";
  form.append("files", new File([sources[name]], basename(name), { type }), basename(name));
  form.append("paths", name);
}
form.append("archive", new File([archive], "prompt-6.zip", { type: "application/zip" }));
form.append("bundleName", "prompt-6");

const upload = await fetch(`${baseUrl}/api/admin/uploads`, { method: "POST", headers: { cookie, origin: baseUrl }, body: form });
const result = await upload.json();
if (!upload.ok) throw new Error(result.message || `Upload failed with ${upload.status}.`);

const [preview, stylesheet, download] = await Promise.all([
  fetch(`${baseUrl}${result.previewUrl}`),
  fetch(`${baseUrl}${result.previewUrl.replace(/index\.html(?:\?.*)?$/, "styles.css")}`),
  fetch(`${baseUrl}${result.downloadUrl}`),
]);
const zipMagic = new Uint8Array(await download.arrayBuffer()).slice(0, 2);
const slug = `episode-upload-check-${Date.now()}`;
const create = await fetch(`${baseUrl}/api/admin/posts`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie, origin: baseUrl },
  body: JSON.stringify({
    title: "Episode upload integration check",
    slug,
    excerpt: "A temporary episode used to verify multiple prompt bundles.",
    content: "This temporary episode verifies the complete prompt and bundle publishing flow.",
    category: "Development",
    status: "published",
    prompts: [
      { title: "Prompt bundle check", content: "Create the complete source bundle used by this integration check.", previewUrl: result.previewUrl, downloadUrl: result.downloadUrl, fileCount: result.fileCount, totalBytes: result.totalBytes, files: result.files, sortOrder: 0 },
      { title: "Second prompt check", content: "Confirm that one episode can render multiple independent prompts.", fileCount: 0, totalBytes: 0, files: [], sortOrder: 1 },
    ],
    links: [],
  }),
});
const created = await create.json();
if (!create.ok || !created.id) throw new Error(created.message || `Episode creation failed with ${create.status}.`);
const publicPage = await fetch(`${baseUrl}/episodes/${slug}`);
const publicHtml = await publicPage.text();
const remove = await fetch(`${baseUrl}/api/admin/posts/${created.id}`, { method: "DELETE", headers: { cookie, origin: baseUrl } });
const checks = {
  fileCount: result.fileCount,
  previewStatus: preview.status,
  stylesheetStatus: stylesheet.status,
  downloadStatus: download.status,
  validZip: zipMagic[0] === 0x50 && zipMagic[1] === 0x4b,
  publicEpisodeStatus: publicPage.status,
  multiplePromptsRendered: publicHtml.includes("Prompt bundle check") && publicHtml.includes("Second prompt check"),
  downloadRendered: publicHtml.includes("Download ZIP"),
  temporaryPostDeleted: remove.ok,
  bundleId: result.bundleId,
};
console.log(JSON.stringify(checks));
if (checks.fileCount !== 3 || checks.previewStatus !== 200 || checks.stylesheetStatus !== 200 || checks.downloadStatus !== 200 || !checks.validZip || checks.publicEpisodeStatus !== 200 || !checks.multiplePromptsRendered || !checks.downloadRendered || !checks.temporaryPostDeleted) process.exitCode = 1;
