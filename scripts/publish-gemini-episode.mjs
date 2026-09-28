import { execFileSync } from "node:child_process";
import { join } from "node:path";

await import("./prepare-gemini-content.mjs");
const output = execFileSync(process.execPath, [join(process.cwd(), "node_modules/wrangler/bin/wrangler.js"), "d1", "execute", "pimx-eltex-db", "--remote", "--json", "--file", ".wrangler/gemini-production-seed.sql"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const results = JSON.parse(output);
if (results.some((result) => !result.success)) throw new Error("Gemini content import failed.");
console.log("Published Episode 02 with six Gemini prompts and six matching projects in D1.");
