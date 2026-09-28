import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { zipSync } from "fflate";
import sharp from "sharp";

const root = process.cwd();
const sourceRoot = join(root, "gemini 3.8 flash");
const definitions = [
  ["gemini-aetheria-sky-isles", "Aetheria — Sky Isles Adventure", "A colorful fantasy platformer with floating islands, collectibles, enemies, and checkpoints.", ["HTML", "CSS", "JavaScript", "Three.js"]],
  ["gemini-apex-metropolis", "Apex Metropolis — Open World City", "Explore a living city with vehicles, traffic, missions, weather, and a wanted system.", ["HTML", "CSS", "JavaScript", "Three.js"]],
  ["gemini-metropolis-3d", "Metropolis 3D — Procedural City", "A detailed city showcase with cinematic cameras, moving traffic, lighting, and weather controls.", ["HTML", "CSS", "JavaScript", "Three.js"]],
  ["gemini-apex-gt", "APEX GT — Hypercar Studio", "A procedural sports car showcase with paint customization, showroom cameras, and driving simulation.", ["HTML", "CSS", "JavaScript", "Three.js"]],
  ["gemini-programmer-room", "Late Night Programmer — SVG Studio", "An editable vector illustration of a programmer's room with lighting controls and SVG export.", ["HTML", "CSS", "JavaScript", "SVG"]],
  ["gemini-aurelia-restaurant", "Aurelia — Restaurant Website", "A luxury restaurant website with a menu, gallery, reservations, and responsive navigation.", ["HTML", "CSS", "JavaScript"]],
];
const slug = "gemini-3-8-flash-six-ai-builds";
const title = "Gemini 3.8 Flash — Six AI Builds";
const videoId = "hIZRbpWJZYQ";
const publishedAt = "2026-09-28T12:00:00.000Z";
const excerpt = "Six Gemini 3.8 Flash prompts, from 3D games and city scenes to an SVG studio and restaurant website. Preview every build and download its complete source.";
const content = "Episode 02 brings together all six builds from the Gemini 3.8 Flash video. The prompts and projects follow the original video order: a fantasy platformer, an open-world city game, a procedural city showcase, a hypercar studio, an SVG programmer room, and a premium restaurant website. Each prompt includes its matching live preview and source download.";
const id = (value) => {
  const hash = createHash("sha256").update(`pimx-eltex:gemini-3.8-flash:${value}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};
const sql = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? filesIn(join(directory, entry.name)) : [join(directory, entry.name)]))).flat().sort();
}
const mime = (name) => ({ ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".md": "text/markdown" })[name.slice(name.lastIndexOf("."))] || "application/octet-stream";
const promptText = await readFile(join(sourceRoot, "prompt.txt"), "utf8");
const matches = [...promptText.matchAll(/^PROMPT\s+(\d+)\s+[—-]\s+([^\r\n]+)\r?\n([\s\S]*?)(?=^PROMPT\s+\d+\s+[—-]|(?![\s\S]))/gm)];
if (matches.length !== definitions.length || matches.some((match, index) => Number(match[1]) !== index + 1)) throw new Error("Expected six ordered Gemini prompts.");

const postId = id("episode");
// Reuse the channel's existing publisher; never create a login or administrator.
const author = "COALESCE((SELECT author_id FROM posts WHERE slug='muse-spark-1-3-original-3d-platformer'), (SELECT id FROM users WHERE role='admin' AND status='active' AND admin_permissions IS NULL ORDER BY created_at LIMIT 1))";
const statements = [
  `INSERT INTO posts (id,author_id,slug,title,excerpt,content,youtube_video_id,category,status,published_at) VALUES (${sql(postId)},${author},${sql(slug)},${sql(title)},${sql(excerpt)},${sql(content)},${sql(videoId)},'AI Development','published',${Date.parse(publishedAt) / 1000}) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,content=excluded.content,youtube_video_id=excluded.youtube_video_id,category=excluded.category,status=excluded.status,published_at=excluded.published_at,updated_at=unixepoch();`,
];
const prompts = [];
const projects = [];
for (let index = 0; index < definitions.length; index++) {
  const [projectSlug, projectTitle, description, tech] = definitions[index];
  const source = join(sourceRoot, `prompt ${index + 1}`);
  const destination = join(root, "public", "demos", projectSlug);
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
  const htmlPath = join(destination, "index.html");
  let html = await readFile(htmlPath, "utf8");
  html = html.replace(/<link\s+rel=["'](?:shortcut )?icon["'][^>]*>/gi, "").replace(/<head>/i, '<head>\n<link rel="icon" type="image/svg+xml" href="/icon.svg" />\n<meta name="robots" content="noindex, follow" />');
  if (index === 2) {
    // Use the exact libraries already supplied with the other Gemini projects.
    // The original downloadable sources retain their original CDN references.
    await mkdir(join(destination, "lib"), { recursive: true });
    await cp(join(sourceRoot, "prompt 1", "three.min.js"), join(destination, "lib", "three.min.js"));
    await cp(join(sourceRoot, "prompt 4", "js", "libs", "OrbitControls.js"), join(destination, "lib", "OrbitControls.js"));
    html = html.replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "lib/three.min.js").replace("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js", "lib/OrbitControls.js");
  }
  if (index === 5) {
    const scriptPath = join(destination, "js", "main.js");
    let script = await readFile(scriptPath, "utf8");
    const imageUrls = [...new Set([...`${html}\n${script}`.matchAll(/https:\/\/images\.unsplash\.com\/[^"'\s<>]+/g)].map((match) => match[0]))];
    await mkdir(join(destination, "assets"), { recursive: true });
    // Cache compressed preview images in the repository so builds and visitors
    // do not need to fetch the restaurant's images from a third-party host.
    for (const imageUrl of imageUrls) {
      const imageName = `${createHash("sha256").update(imageUrl).digest("hex").slice(0, 16)}.webp`;
      const imagePath = join(destination, "assets", imageName);
      if (!await stat(imagePath).catch(() => null)) {
        // This original placeholder no longer exists (404). Reuse a food image
        // already included by the project; leave downloaded original code intact.
        const sourceUrl = imageUrl.includes("photo-1514944298352-f472851d726b") ? "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85" : imageUrl;
        const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error(`Restaurant image returned ${response.status}: ${imageUrl}`);
        const optimized = await sharp(Buffer.from(await response.arrayBuffer())).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toBuffer();
        await writeFile(imagePath, optimized);
      }
      html = html.replaceAll(imageUrl, `assets/${imageName}`);
      script = script.replaceAll(imageUrl, `assets/${imageName}`);
    }
    await writeFile(scriptPath, script);
  }
  await writeFile(htmlPath, html);
  const paths = await filesIn(source);
  const archive = Object.fromEntries(await Promise.all(paths.map(async (path) => [relative(source, path).replaceAll("\\", "/"), [new Uint8Array(await readFile(path)), { mtime: new Date("2000-01-01T00:00:00.000Z") }]])));
  await mkdir(join(root, "public", "downloads"), { recursive: true });
  await writeFile(join(root, "public", "downloads", `${projectSlug}.zip`), zipSync(archive, { level: 6 }));
  const files = await Promise.all(paths.map(async (path) => ({ path: relative(source, path).replaceAll("\\", "/"), size: (await stat(path)).size, type: mime(basename(path)) })));
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const previewUrl = `/demos/${projectSlug}/index.html`;
  const downloadUrl = `/downloads/${projectSlug}.zip`;
  const coverUrl = `/project-previews/${projectSlug}.webp`;
  const prompt = matches[index];
  const promptDescription = `Gemini 3.8 Flash · Prompt ${String(index + 1).padStart(2, "0")} — ${description}`;
  prompts.push({ title: prompt[2].trim(), description: promptDescription, content: prompt[3].trim(), coverUrl, previewUrl, downloadUrl, fileCount: files.length, totalBytes, files });
  projects.push({ slug: projectSlug, title: projectTitle, description, tech, previewUrl, coverUrl, downloadUrl, fileCount: files.length, episode: `Episode 02 · Gemini 3.8 Flash · Prompt ${String(index + 1).padStart(2, "0")}` });
  // Resolve the post by slug on every import so existing content remains idempotent.
  statements.push(`INSERT INTO episode_prompts (id,post_id,title,description,content,preview_url,download_url,file_count,total_bytes,files,sort_order) VALUES (${sql(id(`prompt-${index + 1}`))},(SELECT id FROM posts WHERE slug=${sql(slug)}),${sql(prompt[2].trim())},${sql(promptDescription)},${sql(prompt[3].trim())},${sql(previewUrl)},${sql(downloadUrl)},${files.length},${totalBytes},${sql(JSON.stringify(files))},${index}) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,content=excluded.content,preview_url=excluded.preview_url,download_url=excluded.download_url,file_count=excluded.file_count,total_bytes=excluded.total_bytes,files=excluded.files,sort_order=excluded.sort_order,updated_at=unixepoch();`);
  statements.push(`INSERT INTO projects (id,slug,title,description,tech,preview_url,download_url,cover_url,status) VALUES (${sql(id(projectSlug))},${sql(projectSlug)},${sql(projectTitle)},${sql(description)},${sql(JSON.stringify(tech))},${sql(previewUrl)},${sql(downloadUrl)},${sql(coverUrl)},'published') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,tech=excluded.tech,preview_url=excluded.preview_url,download_url=excluded.download_url,cover_url=excluded.cover_url,status=excluded.status,updated_at=unixepoch();`);
}
await mkdir(join(root, "src", "content"), { recursive: true });
await writeFile(join(root, "src", "content", "gemini-content.json"), `${JSON.stringify({ post: { slug, title, excerpt, content, category: "AI Development", date: "Sep 28, 2026", publishedAt, readTime: "1 min read", accent: "violet", youtubeVideoId: videoId }, projects, episode: { videoId, number: "Episode 02", overview: excerpt, prompts, links: [] } }, null, 2)}\n`);
await mkdir(join(root, ".wrangler"), { recursive: true });
await writeFile(join(root, ".wrangler", "gemini-production-seed.sql"), `${statements.join("\n")}\n`);
console.log(`Prepared Episode 02: ${prompts.length} Gemini prompts with ordered demos and downloads.`);
