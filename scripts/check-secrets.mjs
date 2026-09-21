import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"])
  .toString("utf8").split("\0").filter(Boolean);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
];
const forbiddenNames = /(?:^|\/)(?:\.env(?:\.[^/]+)?|\.dev\.vars|[^/]+\.pem)$/i;
const failures = [];

for (const path of files) {
  if (!existsSync(path)) continue;
  const normalized = path.replaceAll("\\", "/");
  if (forbiddenNames.test(normalized) && normalized !== ".env.example" && normalized !== ".dev.vars.example") {
    failures.push(normalized);
    continue;
  }
  if (statSync(path).size > 1024 * 1024) continue;
  const content = readFileSync(path);
  if (content.includes(0)) continue;
  const text = content.toString("utf8");
  if (secretPatterns.some((pattern) => pattern.test(text))) failures.push(normalized);
}

if (failures.length) {
  console.error("Potential secret or private configuration in:");
  for (const path of failures) console.error(`- ${path}`);
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed (${files.length} files checked).`);
}
