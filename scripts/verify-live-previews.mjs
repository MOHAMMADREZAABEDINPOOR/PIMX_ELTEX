const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const episodeUrl = `${baseUrl}/episodes/muse-spark-1-3-original-3d-platformer`;
const episode = await fetch(episodeUrl);
if (!episode.ok) throw new Error(`Episode returned ${episode.status}.`);
const html = await episode.text();
const previewPaths = Array.from(new Set(Array.from(html.matchAll(/\/(?:api\/files\/[^"']+|demos\/[^"']+)\/index\.html/g), (match) => match[0])));
if (previewPaths.length !== 7) throw new Error(`Expected 7 live previews, found ${previewPaths.length}.`);

const results = await Promise.all(previewPaths.map(async (path, index) => {
  const response = await fetch(`${baseUrl}${path}`);
  const source = await response.text();
  const csp = response.headers.get("content-security-policy") || "";
  const scriptsAllowed = /(?:script-src[^;]*(?:https:|cdnjs\.cloudflare\.com)|default-src[^;]*\*)/.test(csp);
  const startAdventureReady = !path.includes("luma-meadows-3d-platformer") || (source.includes("Start Adventure") && source.includes("three.min.js") && scriptsAllowed);
  const localAssets = Array.from(source.matchAll(/(?:src|href)=["']([^"']+)["']/g), (match) => match[1]).filter((url) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url));
  const assetStatuses = await Promise.all(localAssets.map(async (asset) => (await fetch(new URL(asset, `${baseUrl}${path}`))).status));
  return { index: index + 1, status: response.status, scriptsAllowed, startAdventureReady, localAssets: localAssets.length, assetsReady: assetStatuses.every((status) => status === 200) };
}));

if (results.some((result) => result.status !== 200 || !result.scriptsAllowed || !result.startAdventureReady || !result.assetsReady)) {
  throw new Error(`Live preview verification failed: ${JSON.stringify(results)}`);
}
console.log(JSON.stringify({ episode: episodeUrl, previews: results }));
