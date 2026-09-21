import { spawnSync } from "node:child_process";
import { join } from "node:path";

await import("./prepare-muse-content.mjs");

const cli = join(process.cwd(), "node_modules", "@opennextjs", "cloudflare", "dist", "cli", "index.js");
const result = spawnSync(process.execPath, [cli, "build"], {
  cwd: process.cwd(),
  env: { ...process.env, PIMX_STATIC_BUILD: "1" },
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

await import("./prepare-pages-output.mjs");
