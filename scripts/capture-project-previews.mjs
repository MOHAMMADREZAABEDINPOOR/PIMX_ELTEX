import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = process.env.SCREENSHOT_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDirectory = join(process.cwd(), "public", "project-previews");
const slugs = [
  "luma-meadows-3d-platformer",
  "neon-harbor-open-city",
  "neon-metropolis-3d-city",
  "aurora-gt-showcase",
  "nova-svg-studio",
  "maison-noir-restaurant",
  "flappy-legends",
];

const password = process.env.TEST_ADMIN_PASSWORD;
if (!password) throw new Error("Set TEST_ADMIN_PASSWORD before capturing project previews.");

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email: "admin@pimx-eltex.local", password, token: "" }),
});
if (!login.ok) throw new Error(`Admin login returned ${login.status}: ${await login.text()}`);
const cookie = login.headers.get("set-cookie")?.split(";")[0];
if (!cookie) throw new Error("Admin login did not return a session cookie.");

const projectsResponse = await fetch(`${baseUrl}/api/admin/projects`, { headers: { cookie } });
if (!projectsResponse.ok) throw new Error(`Projects returned ${projectsResponse.status}.`);
const payload = await projectsResponse.json();
const previewBySlug = new Map(payload.projects.map((project) => [project.slug, project.previewUrl]));
const missing = slugs.filter((slug) => !previewBySlug.has(slug));
if (missing.length) throw new Error(`Missing project previews: ${missing.join(", ")}`);

await mkdir(outputDirectory, { recursive: true });
for (let index = 0; index < slugs.length; index += 1) {
  const slug = slugs[index];
  const temporaryPng = join(outputDirectory, `.${slug}.png`);
  const browserProfile = await mkdtemp(join(tmpdir(), "pimx-preview-"));
  const result = spawnSync(browser, [
    "--headless=new",
    "--hide-scrollbars",
    "--enable-unsafe-swiftshader",
    "--disable-extensions",
    `--user-data-dir=${browserProfile}`,
    "--window-size=1440,900",
    "--virtual-time-budget=5000",
    `--screenshot=${temporaryPng}`,
    new URL(previewBySlug.get(slug), baseUrl).toString(),
  ], { encoding: "utf8", timeout: 45_000 });
  await rm(browserProfile, { recursive: true, force: true });
  if (result.status !== 0) throw new Error(`Screenshot ${index + 1} failed: ${result.stderr || result.stdout}`);
  const source = await readFile(temporaryPng);
  const optimized = await sharp(source).resize(1200, 675, { fit: "cover" }).webp({ quality: 78, effort: 5 }).toBuffer();
  await writeFile(join(outputDirectory, `${slug}.webp`), optimized);
  await unlink(temporaryPng);
  console.log(`${slug}: ${optimized.byteLength} bytes`);
}
