import { execFileSync } from "node:child_process";
import { join } from "node:path";

await import("./prepare-gemini-content.mjs");
// Wrangler prints upload progress before JSON for file imports. Its nonzero
// exit status throws here, so do not parse the mixed progress/JSON output.
execFileSync(process.execPath, [join(process.cwd(), "node_modules/wrangler/bin/wrangler.js"), "d1", "execute", "pimx-eltex-db", "--remote", "--json", "--file", ".wrangler/gemini-production-seed.sql"], { stdio: ["ignore", "pipe", "inherit"] });
console.log("Published Episode 02 with six Gemini prompts and six matching projects in D1.");
