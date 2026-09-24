import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
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

const output = (name, value) => {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
};

const SEPARATOR = /[\n,]/;

const listOf = (value) =>
  (value ?? "")
    .split(SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item !== "");

const report = join(
  mkdtempSync(join(tmpdir(), "anpord-eval-")),
  "results.json"
);
output("report", report);

const file = process.env.ANPORD_EVAL_FILE;
const gate = process.env.ANPORD_EVAL_GATE;
const timeout = process.env.ANPORD_EVAL_TIMEOUT;
const caseId = process.env.ANPORD_EVAL_CASE?.trim();
const variants = listOf(process.env.ANPORD_EVAL_VARIANTS);
const result = spawnSync(
  process.execPath,
  [
    binary,
    "eval",
    ...(file ? [resolve(file)] : []),
    ...(caseId ? ["--case", caseId] : []),
    ...variants.flatMap((variant) => ["--variant", variant]),
    ...(gate ? ["--fail-on", gate] : []),
    ...(timeout ? ["--timeout", timeout] : []),
    "--output",
    report,
  ],
  { stdio: "inherit" }
);
if (result.error) {
  console.error(result.error.message);
}

const outcomes = existsSync(report)
  ? JSON.parse(readFileSync(report, "utf8"))
  : [];
const conclusionOf = () => {
  const failed =
    result.status !== 0 ||
    outcomes.some(
      (outcome) => outcome.error !== null || outcome.problems.length > 0
    );
  if (failed) {
    return "failure";
  }
  const settled =
    outcomes.length > 0 && outcomes.every((outcome) => outcome.batch !== null);
  return settled ? "success" : "neutral";
};

output(
  "batch-ids",
  outcomes
    .map((outcome) => outcome.batchId)
    .filter((id) => id !== null)
    .join(",")
);
output("conclusion", conclusionOf());

process.exit(result.status ?? 1);
