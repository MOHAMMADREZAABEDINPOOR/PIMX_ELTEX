import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { unzipSync } from "fflate";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3001";
const content = JSON.parse(await readFile("src/content/gemini-content.json", "utf8"));
const page = await fetch(`${baseUrl}/episodes/${content.post.slug}`);
assert.equal(page.status, 200, "Episode 02 must be accessible.");
const html = await page.text();
assert(html.includes(`youtube-nocookie.com/embed/${content.post.youtubeVideoId}`), "Episode 02 must contain the provided video.");
assert(html.includes("Episode 02"), "Episode number must be correct.");
let previousPosition = -1;
for (let index = 0; index < content.episode.prompts.length; index++) {
  const position = html.indexOf(`id="prompt-${index + 1}"`);
  assert(position > previousPosition, `Prompt ${index + 1} must exist in the correct order.`);
  previousPosition = position;
}
const projectsHtml = await (await fetch(`${baseUrl}/code`)).text();
previousPosition = -1;
for (const project of content.projects) {
  const position = projectsHtml.indexOf(`id="${project.slug}"`);
  assert(position > previousPosition, `${project.slug} must retain prompt order in Projects.`);
  previousPosition = position;
}
async function sourceFiles(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map((entry) => entry.isDirectory() ? sourceFiles(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const results = [];
for (let index = 0; index < content.projects.length; index++) {
  const project = content.projects[index];
  const preview = await fetch(new URL(project.previewUrl, baseUrl));
  assert.equal(preview.status, 200, `${project.slug}: preview must be available.`);
  const previewHtml = await preview.text();
  assert(previewHtml.includes('/icon.svg'), `${project.slug}: branded favicon must be set.`);
  const assetUrls = [...new Set([...previewHtml.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]).filter((asset) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(asset)))];
  if (index === 5) {
    const script = await (await fetch(new URL("js/main.js", new URL(project.previewUrl, baseUrl)))).text();
    assetUrls.push(...[...new Set([...script.matchAll(/assets\/[a-z0-9]+\.webp/g)].map((match) => match[0]))]);
  }
  const assetStatuses = await Promise.all(assetUrls.map(async (asset) => ({ asset, status: (await fetch(new URL(asset, new URL(project.previewUrl, baseUrl)))).status })));
  assert(assetStatuses.every((asset) => asset.status === 200), `${project.slug}: missing assets ${JSON.stringify(assetStatuses.filter((asset) => asset.status !== 200))}`);
  const download = await fetch(new URL(project.downloadUrl, baseUrl));
  assert.equal(download.status, 200, `${project.slug}: download must be available.`);
  const archive = unzipSync(new Uint8Array(await download.arrayBuffer()));
  const source = join("gemini 3.8 flash", `prompt ${index + 1}`);
  const files = await sourceFiles(source);
  assert.equal(Object.keys(archive).length, files.length, `${project.slug}: all source files must be included.`);
  for (const file of files) {
    const path = relative(source, file).replaceAll("\\", "/");
    assert.deepEqual(Buffer.from(archive[path] || []), await readFile(file), `${project.slug}: original ${path} must be preserved.`);
  }
  const cover = await fetch(new URL(project.coverUrl, baseUrl));
  assert.equal(cover.status, 200, `${project.slug}: cover must be available.`);
  assert((await cover.arrayBuffer()).byteLength > 5000, `${project.slug}: cover must not be blank.`);
  results.push({ prompt: index + 1, slug: project.slug, preview: preview.status, assets: assetUrls.length, originalFiles: files.length, download: download.status, cover: cover.status });
}
const original = await fetch(`${baseUrl}/episodes/muse-spark-1-3-original-3d-platformer`);
assert.equal(original.status, 200, "Episode 01 must remain available.");
assert((await original.text()).includes("youtube-nocookie.com/embed/yqGWdCgxh7Q"), "Episode 01 video must be retained.");
const home = await (await fetch(baseUrl)).text();
assert(home.includes(content.post.title), "New episode must be shown on the homepage.");
const sitemap = await (await fetch(`${baseUrl}/sitemap.xml`)).text();
assert(sitemap.includes(`/episodes/${content.post.slug}`), "Episode 02 must be included in the sitemap.");
console.log(JSON.stringify({ ok: true, episode: `${baseUrl}/episodes/${content.post.slug}`, prompts: 6, originalEpisodeRetained: true, results }));
