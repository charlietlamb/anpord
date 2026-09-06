import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

if (!process.env.ANPORD_API_KEY?.trim()) {
  console.error("Set the action's api-key input to an ANPORD_API_KEY secret.");
  process.exit(1);
}

const require = createRequire(join(process.cwd(), "package.json"));
let binary;
try {
  binary = join(
    dirname(require.resolve("anpord/package.json")),
    "dist/bin.mjs"
  );
} catch {
  console.error("Install anpord in the project before running this action.");
  process.exit(1);
}
const report = join(
  mkdtempSync(join(tmpdir(), "anpord-eval-")),
  "results.json"
);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `report=${report}\n`);
}
const file = process.env.ANPORD_EVAL_FILE;
const result = spawnSync(
  process.execPath,
  [
    binary,
    "eval",
    ...(file ? [resolve(file)] : []),
    "--fail-on",
    process.env.ANPORD_EVAL_GATE || "strict",
    "--timeout",
    process.env.ANPORD_EVAL_TIMEOUT || "1200",
    "--output",
    report,
  ],
  { stdio: "inherit" }
);
if (result.error) {
  console.error(result.error.message);
}
process.exit(result.status ?? 1);
