import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const openNext = join(root, ".open-next");
const output = join(root, ".pages-output");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(join(openNext, "assets"), output, { recursive: true });

const worker = (await readFile(join(openNext, "worker.js"), "utf8"))
  .replaceAll('from "./', 'from "../.open-next/')
  .replaceAll('import("./', 'import("../.open-next/')
  .replace(
    "async fetch(request, env, ctx) {",
    `async fetch(request, env, ctx) {
        const pathname = new URL(request.url).pathname;
        if (pathname.startsWith("/demos/") || pathname.startsWith("/downloads/")) {
            return env.ASSETS.fetch(request);
        }`,
  );
await writeFile(join(output, "_worker.js"), worker);

console.log("Cloudflare Pages output prepared in .pages-output.");
