import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { zipSync } from "fflate";

const password = process.env.TEST_ADMIN_PASSWORD;
if (!password) throw new Error("Set TEST_ADMIN_PASSWORD before syncing content.");
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const episodeSlug = "muse-spark-1-3-original-3d-platformer";
const root = join(process.cwd(), "muse spark 1.3");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}

function mime(path) {
  if (/\.html?$/i.test(path)) return "text/html";
  if (/\.css$/i.test(path)) return "text/css";
  if (/\.m?js$/i.test(path)) return "text/javascript";
  if (/\.json$/i.test(path)) return "application/json";
  if (/\.svg$/i.test(path)) return "image/svg+xml";
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.jpe?g$/i.test(path)) return "image/jpeg";
  return "application/octet-stream";
}

async function uploadPrompt(number, headers) {
  const folder = join(root, `prompt ${number}`);
  const paths = await walk(folder);
  const sources = Object.fromEntries(await Promise.all(paths.map(async (path) => [relative(folder, path).replace(/\\/g, "/"), new Uint8Array(await readFile(path))])));
  const archive = zipSync(sources, { level: 6 });
  const form = new FormData();
  for (const [path, bytes] of Object.entries(sources)) {
    form.append("files", new File([bytes], basename(path), { type: mime(path) }), basename(path));
    form.append("paths", path);
  }
  const bundleName = `muse-spark-1-3-prompt-${number}`;
  form.append("archive", new File([archive], `${bundleName}.zip`, { type: "application/zip" }));
  form.append("bundleName", bundleName);
  const response = await fetch(`${baseUrl}/api/admin/uploads`, { method: "POST", headers, body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || `Prompt ${number} upload failed.`);
  return result;
}

const login = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email: "admin@pimx-eltex.local", password, turnstileToken: "" }) });
if (!login.ok) throw new Error(`Login failed with ${login.status}.`);
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not create a session cookie.");
const headers = { cookie, origin: baseUrl };

const postsResponse = await fetch(`${baseUrl}/api/admin/posts`, { headers });
const posts = (await postsResponse.json()).posts || [];
const post = posts.find((item) => item.slug === episodeSlug);
if (!post) throw new Error("The Muse Spark episode does not exist.");
const detailResponse = await fetch(`${baseUrl}/api/admin/posts/${post.id}`, { headers });
const detail = (await detailResponse.json()).episode;
if (!detail) throw new Error("The Muse Spark episode could not be loaded.");

const promptText = await readFile(join(root, "prompt.txt"), "utf8");
const matches = Array.from(promptText.matchAll(/^PROMPT\s+(\d+)\s+[—-]\s+([^\r\n]+)\r?\n([\s\S]*?)(?=^PROMPT\s+\d+\s+[—-]|(?![\s\S]))/gm));
if (matches.length !== 7) throw new Error(`Expected 7 prompts, found ${matches.length}.`);

const bundles = [];
for (let index = 0; index < matches.length; index += 1) {
  const existing = detail.prompts[index];
  bundles.push(existing?.previewUrl && existing?.downloadUrl ? existing : await uploadPrompt(index + 1, headers));
}

const prompts = matches.map((match, index) => ({
  title: match[2].trim(),
  description: `Complete source and playable result for Muse Spark prompt ${index + 1}.`,
  content: match[3].trim(),
  previewUrl: bundles[index].previewUrl,
  downloadUrl: bundles[index].downloadUrl,
  fileCount: bundles[index].fileCount,
  totalBytes: bundles[index].totalBytes,
  files: bundles[index].files,
  sortOrder: index,
}));

const updateResponse = await fetch(`${baseUrl}/api/admin/posts/${post.id}`, {
  method: "PATCH",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({
    title: "Muse Spark 1.3 — Seven AI Builds",
    slug: episodeSlug,
    excerpt: "Seven complete AI prompts with playable browser demos and downloadable source bundles in one episode.",
    content: "This Muse Spark 1.3 episode contains every prompt and every generated project in one place. Read each complete prompt, launch its isolated live preview, or download the original source bundle.",
    category: "AI Development",
    status: "published",
    youtubeVideoId: detail.youtubeVideoId || "https://www.youtube.com/watch?v=yqGWdCgxh7Q",
    prompts,
    links: detail.links.map((link) => ({ title: link.title, description: link.description || "", url: link.url, sortOrder: link.sortOrder })),
  }),
});
if (!updateResponse.ok) throw new Error((await updateResponse.json()).message || "Episode update failed.");

const projectDefinitions = [
  ["luma-meadows-3d-platformer", "Luma Meadows — 3D Platformer", ["HTML", "JavaScript", "Three.js"]],
  ["neon-harbor-open-city", "Neon Harbor — Open City", ["HTML", "JavaScript", "Three.js"]],
  ["neon-metropolis-3d-city", "Neon Metropolis — 3D City", ["HTML", "JavaScript", "Three.js"]],
  ["aurora-gt-showcase", "Aurora GT — 3D Automotive Showcase", ["HTML", "JavaScript", "Three.js"]],
  ["nova-svg-studio", "Nova — SVG Illustration Studio", ["HTML", "SVG", "JavaScript"]],
  ["maison-noir-restaurant", "Maison Noir — Restaurant Website", ["HTML", "CSS", "JavaScript"]],
  ["flappy-legends", "Flappy Legends — Arcade Game", ["HTML", "Canvas", "JavaScript"]],
];
const projectsResponse = await fetch(`${baseUrl}/api/admin/projects`, { headers });
const existingSlugs = new Set(((await projectsResponse.json()).projects || []).map((item) => item.slug));
for (let index = 0; index < projectDefinitions.length; index += 1) {
  const [slug, title, tech] = projectDefinitions[index];
  if (existingSlugs.has(slug)) continue;
  const response = await fetch(`${baseUrl}/api/admin/projects`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ slug, title, description: `The complete playable result generated from Muse Spark 1.3 prompt ${index + 1}.`, tech, previewUrl: bundles[index].previewUrl, downloadUrl: bundles[index].downloadUrl, status: "published" }) });
  if (!response.ok) throw new Error((await response.json()).message || `Project ${index + 1} creation failed.`);
}

console.log(JSON.stringify({ episode: `${baseUrl}/episodes/${episodeSlug}`, prompts: prompts.length, projects: projectDefinitions.length }));
