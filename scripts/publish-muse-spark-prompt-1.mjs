import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { zipSync } from "fflate";

const password = process.env.TEST_ADMIN_PASSWORD;
if (!password) throw new Error("Set TEST_ADMIN_PASSWORD before publishing.");

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const episodeSlug = "muse-spark-1-3-original-3d-platformer";
const projectSlug = "luma-meadows-3d-platformer";
const root = join(process.cwd(), "muse spark 1.3");
const projectFolder = join(root, "prompt 1");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }))).flat();
}

const promptDocument = await readFile(join(root, "prompt.txt"), "utf8");
const promptMatch = promptDocument.match(/^PROMPT 1\s+[—-]\s+([^\r\n]+)\r?\n([\s\S]*?)(?=^PROMPT 2\s+[—-])/m);
if (!promptMatch) throw new Error("PROMPT 1 could not be parsed from prompt.txt.");
const promptTitle = promptMatch[1].trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
const promptContent = promptMatch[2].trim();

const sourcePaths = await walk(projectFolder);
if (!sourcePaths.length) throw new Error("Prompt 1 has no project files.");
const sources = Object.fromEntries(await Promise.all(sourcePaths.map(async (path) => [
  relative(projectFolder, path).replace(/\\/g, "/"),
  new Uint8Array(await readFile(path)),
])));
const archive = zipSync(sources, { level: 6 });

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email: "admin@pimx-eltex.local", password, turnstileToken: "" }),
});
if (!login.ok) throw new Error(`Login failed with ${login.status}.`);
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not create a session cookie.");

const requestHeaders = { cookie, origin: baseUrl };
const [existingPostsResponse, existingProjectsResponse] = await Promise.all([
  fetch(`${baseUrl}/api/admin/posts`, { headers: requestHeaders }),
  fetch(`${baseUrl}/api/admin/projects`, { headers: requestHeaders }),
]);
const existingPosts = (await existingPostsResponse.json()).posts || [];
const existingProjects = (await existingProjectsResponse.json()).projects || [];
if (existingPosts.some((post) => post.slug === episodeSlug) || existingProjects.some((project) => project.slug === projectSlug)) {
  throw new Error("Muse Spark Prompt 1 is already published. Remove the existing record before publishing it again.");
}

const form = new FormData();
for (const [path, bytes] of Object.entries(sources)) {
  const type = path.endsWith(".html") ? "text/html" : path.endsWith(".css") ? "text/css" : path.endsWith(".js") ? "text/javascript" : "application/octet-stream";
  form.append("files", new File([bytes], basename(path), { type }), basename(path));
  form.append("paths", path);
}
form.append("archive", new File([archive], "luma-meadows-3d-platformer.zip", { type: "application/zip" }));
form.append("bundleName", "luma-meadows-3d-platformer");

const upload = await fetch(`${baseUrl}/api/admin/uploads`, { method: "POST", headers: requestHeaders, body: form });
const bundle = await upload.json();
if (!upload.ok) throw new Error(bundle.message || `Upload failed with ${upload.status}.`);

const episode = await fetch(`${baseUrl}/api/admin/posts`, {
  method: "POST",
  headers: { ...requestHeaders, "content-type": "application/json" },
  body: JSON.stringify({
    title: "Muse Spark 1.3 — Original 3D Platformer",
    slug: episodeSlug,
    excerpt: "The first Muse Spark 1.3 prompt, its playable Luma Meadows browser demo, and the complete downloadable source.",
    content: "This episode resource contains the first Muse Spark 1.3 experiment: an original 3D platformer built as a standalone HTML project. Copy the exact prompt, open the playable preview, or download the complete source.",
    category: "AI Game Development",
    status: "published",
    youtubeVideoId: "https://www.youtube.com/watch?v=yqGWdCgxh7Q",
    prompts: [{
      title: promptTitle,
      description: "Build an original 3D browser platformer with movement, collectibles, enemies, checkpoints, and a complete playable level.",
      content: promptContent,
      previewUrl: bundle.previewUrl,
      downloadUrl: bundle.downloadUrl,
      fileCount: bundle.fileCount,
      totalBytes: bundle.totalBytes,
      files: bundle.files,
      sortOrder: 0,
    }],
    links: [],
  }),
});
const episodeResult = await episode.json();
if (!episode.ok) throw new Error(episodeResult.message || `Episode creation failed with ${episode.status}.`);

const project = await fetch(`${baseUrl}/api/admin/projects`, {
  method: "POST",
  headers: { ...requestHeaders, "content-type": "application/json" },
  body: JSON.stringify({
    slug: projectSlug,
    title: "Luma Meadows — 3D Platformer",
    description: "A complete single-file 3D browser platformer generated from the first Muse Spark 1.3 prompt.",
    tech: ["HTML", "CSS", "JavaScript", "Three.js"],
    previewUrl: bundle.previewUrl,
    downloadUrl: bundle.downloadUrl,
    status: "published",
  }),
});
const projectResult = await project.json();
if (!project.ok) throw new Error(projectResult.message || `Project creation failed with ${project.status}.`);

console.log(JSON.stringify({
  episode: `${baseUrl}/episodes/${episodeSlug}`,
  codeHub: `${baseUrl}/code`,
  preview: `${baseUrl}${bundle.previewUrl}`,
  download: `${baseUrl}${bundle.downloadUrl}`,
  files: bundle.fileCount,
}));
