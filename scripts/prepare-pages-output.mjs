import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

const root = process.cwd();
const openNext = join(root, ".open-next");
const nextApp = join(root, ".next", "server", "app");
const output = join(root, ".pages-output");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(join(openNext, "assets"), output, { recursive: true });

const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk(nextApp);

const staticRoutes = {};
for (const source of files) {
  const appPath = relative(nextApp, source).split(sep).join("/");
  if (appPath.endsWith(".html")) {
    let route = `/${appPath.slice(0, -5)}`;
    if (route === "/page" || route === "/index") route = "/";
    if (route === "/_not-found") {
      await cp(source, join(output, "404.html"));
      continue;
    }
    if (route.startsWith("/_")) continue;
    const assetPath = route === "/" ? "/index.html" : `${route}/index.html`;
    const destination = join(output, assetPath.slice(1));
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination);
    const servePath = route === "/" ? "/" : `${route}/`;
    staticRoutes[route] = servePath;
    staticRoutes[route === "/" ? "/index.html" : `${route}/`] = servePath;
  } else if (appPath.endsWith(".body")) {
    const assetPath = `/${appPath.slice(0, -5)}`;
    const destination = join(output, assetPath.slice(1));
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination);
    staticRoutes[assetPath] = assetPath;
  }
}

const worker = `const STATIC_ROUTES = ${JSON.stringify(staticRoutes)};
const UPSTREAM = "https://pimx-eltex.mohammadrezaabedinpoor6.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const staticAsset = STATIC_ROUTES[url.pathname];
    if (staticAsset || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/demos/") || url.pathname.startsWith("/downloads/") || url.pathname.startsWith("/project-previews/")) {
      const assetUrl = new URL(staticAsset || url.pathname, url);
      assetUrl.search = "";
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    const upstreamUrl = new URL(url.pathname + url.search, UPSTREAM);
    const headers = new Headers(request.headers);
    headers.delete("host");
    const response = await fetch(new Request(upstreamUrl, { method: request.method, headers, body: request.body, redirect: "manual" }));
    const responseHeaders = new Headers(response.headers);
    const location = responseHeaders.get("location");
    if (location) responseHeaders.set("location", location.replace(UPSTREAM, url.origin));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
  },
};
`;
await writeFile(join(output, "_worker.js"), worker);

console.log(`Cloudflare Pages output prepared with ${Object.keys(staticRoutes).length} static route aliases.`);
