import assert from "node:assert/strict";
import { test } from "node:test";
import pagesWorker from "../.pages-output/_worker.js";

test("Pages loads a missing Next.js chunk from the backend asset bundle", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (request) => {
    requested.push(request.url);
    return new Response("working chunk", { status: 200, headers: { "content-type": "application/javascript" } });
  };

  try {
    const response = await pagesWorker.fetch(
      new Request("https://pimxeltex.pages.dev/_next/static/chunks/app/layout-missing.js"),
      { ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } },
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "working chunk");
    assert.deepEqual(requested, ["https://pimx-eltex.mohammadrezaabedinpoor6.workers.dev/_next/static/chunks/app/layout-missing.js"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Pages sends dynamic requests through the internal Worker binding", async () => {
  const requests = [];
  const response = await pagesWorker.fetch(
    new Request("https://pimxeltex.pages.dev/api/auth/me", { headers: { origin: "https://pimxeltex.pages.dev" } }),
    { BACKEND: { fetch: async (request) => {
      requests.push(request);
      return Response.json({ user: null });
    } } },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user: null });
  assert.equal(requests.length, 1);
  assert.equal(new URL(requests[0].url).pathname, "/api/auth/me");
  assert.equal(requests[0].headers.get("origin"), "https://pimxeltex.pages.dev");
});

test("Pages preserves an untrusted Origin so the backend can reject it", async () => {
  let forwardedOrigin;
  await pagesWorker.fetch(
    new Request("https://pimxeltex.pages.dev/api/auth/login", { method: "POST", headers: { origin: "https://example.com" } }),
    { BACKEND: { fetch: async (request) => {
      forwardedOrigin = request.headers.get("origin");
      return Response.json({ message: "rejected" }, { status: 403 });
    } } },
  );
  assert.equal(forwardedOrigin, "https://example.com");
});

test("Pages forwards Cloudflare visitor location instead of client supplied location", async () => {
  let forwarded;
  const request = new Request("https://pimxeltex.pages.dev/api/auth/me", { headers: { "x-pimx-visitor-country": "ZZ" } });
  Object.assign(request, { cf: { country: "DE", city: "Berlin", region: "Berlin" } });
  await pagesWorker.fetch(request, { BACKEND: { fetch: async (upstream) => {
    forwarded = upstream.headers;
    return Response.json({ user: null });
  } } });
  assert.equal(forwarded.get("x-pimx-visitor-country"), "DE");
  assert.equal(forwarded.get("x-pimx-visitor-city"), "Berlin");
  assert.equal(forwarded.get("x-pimx-visitor-region"), "Berlin");
  await pagesWorker.fetch(new Request("https://pimxeltex.pages.dev/api/auth/me", { headers: { "x-pimx-visitor-country": "ZZ" } }), { BACKEND: { fetch: async (upstream) => {
    forwarded = upstream.headers;
    return Response.json({ user: null });
  } } });
  assert.equal(forwarded.get("x-pimx-visitor-country"), null);
});
