import assert from "node:assert/strict";
import { test } from "node:test";
import pagesWorker from "../.pages-output/_worker.js";

test("Pages loads a missing Next.js chunk from the backend asset bundle", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (request) => {
    requested.push(String(request));
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
