import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { zipSync } from "fflate";

const root = process.cwd();
const sourceRoot = join(root, "muse spark 1.3");
const publicRoot = join(root, "public");
const sqlPath = join(root, ".wrangler", "muse-production-seed.sql");
const slugs = [
  "luma-meadows-3d-platformer",
  "neon-harbor-open-city",
  "neon-metropolis-3d-city",
  "aurora-gt-showcase",
  "nova-svg-studio",
  "maison-noir-restaurant",
  "flappy-legends",
];
const titles = [
  "Luma Meadows — 3D Platformer",
  "Neon Harbor — Open City",
  "Neon Metropolis — 3D City",
  "Aurora GT — 3D Automotive Showcase",
  "Nova — SVG Illustration Studio",
  "Maison Noir — Restaurant Website",
  "Flappy Legends — Arcade Game",
];
const tech = [
  ["HTML", "CSS", "JavaScript", "Three.js"],
  ["HTML", "JavaScript", "Three.js"],
  ["HTML", "JavaScript", "Three.js"],
  ["HTML", "JavaScript", "Three.js"],
  ["HTML", "SVG", "JavaScript"],
  ["HTML", "CSS", "JavaScript"],
  ["HTML", "Canvas", "JavaScript"],
];

const id = (value) => {
  const hash = createHash("sha256").update(`pimx-eltex:${value}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};
const sql = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const sourceFiles = async (directory) => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? sourceFiles(path) : [path];
}))).flat();
const mime = (name) => name.endsWith(".html") ? "text/html" : name.endsWith(".css") ? "text/css" : name.endsWith(".js") ? "text/javascript" : "application/octet-stream";

const promptText = await readFile(join(sourceRoot, "prompt.txt"), "utf8");
const prompts = [...promptText.matchAll(/^PROMPT\s+(\d+)\s+[—-]\s+([^\r\n]+)\r?\n([\s\S]*?)(?=^PROMPT\s+\d+\s+[—-]|(?![\s\S]))/gm)];
if (prompts.length !== slugs.length || prompts.some((prompt, index) => Number(prompt[1]) !== index + 1)) throw new Error("Expected seven ordered Muse Spark prompts.");

const authorId = id("publisher");
const postId = id("muse-spark-episode");
const statements = [
  "INSERT INTO users (id, name, username, email, password_hash, role, status) VALUES " +
  `(${sql(authorId)}, 'PIMX_ELTEX', 'pimx_publisher', 'publisher@pimx-eltex.invalid', 'disabled', 'user', 'blocked') ON CONFLICT(id) DO NOTHING;`,
  "INSERT INTO posts (id, author_id, slug, title, excerpt, content, youtube_video_id, category, status, published_at) VALUES " +
  `(${sql(postId)}, ${sql(authorId)}, 'muse-spark-1-3-original-3d-platformer', 'Muse Spark 1.3 — Seven AI Builds', ` +
  `${sql("Seven complete AI prompts with playable browser demos and downloadable source bundles in one episode.")}, ` +
  `${sql("This Muse Spark 1.3 episode contains every prompt and every generated project in one place. Read each complete prompt, launch its isolated live preview, or download the original source bundle.")}, ` +
  "'yqGWdCgxh7Q', 'AI Development', 'published', 1789309351) " +
  "ON CONFLICT(slug) DO UPDATE SET title=excluded.title, excerpt=excluded.excerpt, content=excluded.content, youtube_video_id=excluded.youtube_video_id, status='published', updated_at=unixepoch();",
];

for (let index = 0; index < slugs.length; index++) {
  const slug = slugs[index];
  const source = join(sourceRoot, `prompt ${index + 1}`);
  const destination = join(publicRoot, "demos", slug);
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
  const paths = await sourceFiles(source);
  const files = Object.fromEntries(await Promise.all(paths.map(async (path) => [relative(source, path).replaceAll("\\", "/"), new Uint8Array(await readFile(path))])));
  const archive = zipSync(files, { level: 6 });
  await mkdir(join(publicRoot, "downloads"), { recursive: true });
  await writeFile(join(publicRoot, "downloads", `${slug}.zip`), archive);
  const manifest = await Promise.all(paths.map(async (path) => ({ path: relative(source, path).replaceAll("\\", "/"), size: (await stat(path)).size, type: mime(basename(path)) })));
  const totalBytes = manifest.reduce((sum, file) => sum + file.size, 0);
  const previewUrl = `/demos/${slug}/index.html`;
  const downloadUrl = `/downloads/${slug}.zip`;
  const prompt = prompts[index];
  statements.push(
    "INSERT INTO episode_prompts (id, post_id, title, description, content, preview_url, download_url, file_count, total_bytes, files, sort_order) VALUES " +
    `(${sql(id(`prompt-${index + 1}`))}, ${sql(postId)}, ${sql(prompt[2].trim())}, ${sql(`Complete source and playable result for Muse Spark prompt ${index + 1}.`)}, ` +
    `${sql(prompt[3].trim())}, ${sql(previewUrl)}, ${sql(downloadUrl)}, ${manifest.length}, ${totalBytes}, ${sql(JSON.stringify(manifest))}, ${index}) ` +
    "ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, content=excluded.content, preview_url=excluded.preview_url, download_url=excluded.download_url, file_count=excluded.file_count, total_bytes=excluded.total_bytes, files=excluded.files, updated_at=unixepoch();"
  );
  statements.push(
    "INSERT INTO projects (id, slug, title, description, tech, preview_url, download_url, status) VALUES " +
    `(${sql(id(`project-${slug}`))}, ${sql(slug)}, ${sql(titles[index])}, ${sql(`The complete playable result generated from Muse Spark 1.3 prompt ${index + 1}.`)}, ` +
    `${sql(JSON.stringify(tech[index]))}, ${sql(previewUrl)}, ${sql(downloadUrl)}, 'published') ` +
    "ON CONFLICT(slug) DO UPDATE SET title=excluded.title, description=excluded.description, tech=excluded.tech, preview_url=excluded.preview_url, download_url=excluded.download_url, status='published', updated_at=unixepoch();"
  );
}

await mkdir(join(root, ".wrangler"), { recursive: true });
await writeFile(sqlPath, `${statements.join("\n")}\n`);
console.log(`Prepared ${prompts.length} prompts, ${slugs.length} demos and downloads, and ${sqlPath}.`);
