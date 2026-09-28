import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicRoot = resolve(root, "public");
const content = JSON.parse(await readFile(join(root, "src/content/gemini-content.json"), "utf8"));
const workDirectory = await mkdtemp(join(root, ".wrangler", "gemini-browser-"));
const profile = join(workDirectory, "profile");
const server = createServer(async (request, response) => {
  try {
    const path = resolve(publicRoot, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
    if (!path.startsWith(publicRoot + sep)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(path);
    response.setHeader("Content-Type", ({ ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp" })[extname(path)] || "application/octet-stream");
    response.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-downloads; default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; object-src 'none'");
    response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const baseUrl = process.env.TEST_BASE_URL || `http://127.0.0.1:${server.address().port}`;
const browser = spawn(process.env.SCREENSHOT_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--hide-scrollbars", "--disable-extensions", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
let socket;
let counter = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}, sessionId) => new Promise((done, reject) => {
  const id = ++counter;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 30_000);
  pending.set(id, { done, reject, timer });
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
try {
  let port;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch { await pause(250); }
  }
  assert(port, "Chrome did not start.");
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((done, reject) => { socket.onopen = done; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (request) { clearTimeout(request.timer); pending.delete(message.id); if (message.error) request.reject(new Error(message.error.message)); else request.done(message.result); }
    else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  };
  let sessionId;
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const checks = ["!!window.game?.renderer", "!!window.game?.renderer", "!!window.app?.renderer", "!!window.app?.renderer", "!!document.querySelector('#programmer-scene-svg')", "!!document.querySelector('.hero-bg-image')"];
  await mkdir(join(root, "public/project-previews"), { recursive: true });
  const results = [];
  for (let index = Number(process.env.PREVIEW_START || 1) - 1; index < content.projects.length; index++) {
    errors.length = 0;
    const project = content.projects[index];
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    await send("Target.activateTarget", { targetId });
    ({ sessionId } = await send("Target.attachToTarget", { targetId, flatten: true }));
    await send("Runtime.enable", {}, sessionId);
    await send("Page.enable", {}, sessionId);
    await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 750, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send("Page.navigate", { url: new URL(project.previewUrl, baseUrl).toString() }, sessionId);
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      ready = await evaluate(`document.readyState !== 'loading' && (${checks[index]})`).catch(() => false);
      if (ready || errors.length) break;
      await pause(250);
    }
    assert.equal(errors.length, 0, `${project.slug}: ${errors.join("\n")}`);
    assert(ready, `${project.slug}: application did not initialize.`);
    if (index === 5) {
      let imageReady = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        imageReady = await evaluate("document.querySelector('.hero-bg-image').naturalWidth > 0");
        if (imageReady) break;
        await pause(250);
      }
      assert(imageReady, "Restaurant hero image must load.");
    }
    if (index === 0) {
      await evaluate("document.querySelector('#btn-start-adventure').click()");
      assert(await evaluate("window.game.isGameStarted"), "Platformer start button must start the game.");
    }
    await pause(1500);
    if (index < 4) assert(await evaluate("(window.game || window.app).renderer.info.render.calls > 0"), `${project.slug}: 3D scene did not render.`);
    assert.equal(errors.length, 0, `${project.slug}: ${errors.join("\n")}`);
    console.log(JSON.stringify({ prompt: index + 1, ready, render: index < 4 ? await evaluate("(window.game || window.app).renderer.info.render") : null }));
    await send("Page.bringToFront", {}, sessionId);
    const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true }, sessionId);
    const pngPath = join(workDirectory, `${project.slug}.png`);
    await writeFile(pngPath, Buffer.from(screenshot.data, "base64"));
    const optimized = await sharp(pngPath).resize(1200, 750, { fit: "cover" }).webp({ quality: 78, effort: 5 }).toBuffer();
    assert(optimized.length > 5000, `${project.slug}: screenshot appears blank.`);
    await writeFile(join(root, "public/project-previews", `${project.slug}.webp`), optimized);
    results.push({ prompt: index + 1, slug: project.slug, initialized: ready, runtimeErrors: errors.length, coverBytes: optimized.length });
    console.log(JSON.stringify(results.at(-1)));
    await send("Target.closeTarget", { targetId });
  }
  const proofPath = join(root, ".wrangler/gemini-preview-proof.json");
  await mkdir(dirname(proofPath), { recursive: true });
  await writeFile(proofPath, `${JSON.stringify(results, null, 2)}\n`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) await send("Browser.close").catch(() => undefined);
  socket?.close();
  browser.kill();
  server.close();
  // This directory was created directly inside this workspace's .wrangler.
  assert(workDirectory.startsWith(resolve(root, ".wrangler") + sep));
  await pause(500);
  await rm(workDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
