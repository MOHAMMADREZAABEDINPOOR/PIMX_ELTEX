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
const APP_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com; frame-src 'self' https://www.youtube-nocookie.com https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com https://api.resend.com https://cloudflareinsights.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests";
const DEMO_CSP = "sandbox allow-scripts allow-forms; default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; object-src 'none'";

function fetchBackend(request, env) {
  return env.BACKEND ? env.BACKEND.fetch(request) : fetch(request);
}

function secureStaticResponse(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", pathname.startsWith("/demos/") ? DEMO_CSP : APP_CSP);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", pathname.startsWith("/demos/") ? "unsafe-none" : "same-origin");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const staticAsset = STATIC_ROUTES[url.pathname];
    if (staticAsset || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/demos/") || url.pathname.startsWith("/downloads/") || url.pathname.startsWith("/project-previews/")) {
      const assetUrl = new URL(staticAsset || url.pathname, url);
      assetUrl.search = "";
      let response = await env.ASSETS.fetch(new Request(assetUrl, request));
      if (response.status === 404 && url.pathname.startsWith("/_next/")) {
        response = await fetchBackend(new Request(new URL(url.pathname + url.search, UPSTREAM), request), env);
      }
      return secureStaticResponse(response, url.pathname);
    }

    const upstreamUrl = new URL(url.pathname + url.search, UPSTREAM);
    const headers = new Headers(request.headers);
    headers.delete("host");
    for (const key of ["country", "city", "region"]) {
      headers.delete("x-pimx-visitor-" + key);
      if (request.cf?.[key]) headers.set("x-pimx-visitor-" + key, String(request.cf[key]));
    }
    const response = await fetchBackend(new Request(upstreamUrl, { method: request.method, headers, body: request.body, redirect: "manual" }), env);
    const responseHeaders = new Headers(response.headers);
    const location = responseHeaders.get("location");
    if (location) responseHeaders.set("location", location.replace(UPSTREAM, url.origin));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
  },
};
`;
await writeFile(join(output, "_worker.js"), worker);

console.log(`Cloudflare Pages output prepared with ${Object.keys(staticRoutes).length} static route aliases.`);
