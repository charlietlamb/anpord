import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, totalmem } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { compare, regressions } from "./report/compare";
import { flatten, type ResultFile, type SuiteResult } from "./report/metric";
import { comparisonTable, metricsTable } from "./report/table";
import { DEFAULT_RUNNER_SETTINGS, runRunnerSuite } from "./runner/suite";
import { DEFAULT_PLAN } from "./seed/plan";
import { DEFAULT_SERVER_SETTINGS, runServerSuite } from "./server/suite";
import { DEFAULT_WEB_SETTINGS, runWebSuite } from "./web/suite";

const HARNESS_ROOT = resolve(import.meta.dir, "../../..");
const RESULTS = join(HARNESS_ROOT, "apps/perf/results");
const DEFAULT_THRESHOLD_PERCENT = 5;
const ALL_SUITES = ["server", "runner", "web"];

const USAGE = `usage:
  bun run perf <server|runner|web|all> [--quick] [--target <checkout>] [--out <file>] [--json] [--only <endpoint,...>]
  bun run perf ab <server|runner|web|all> --before <checkout> [--after <checkout>] [--quick] [--threshold <percent>]
  bun run perf compare <before.json[,more.json]> <after.json[,more.json]> [--threshold <percent>]`;

const log = (line: string) => process.stdout.write(`${line}\n`);

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    after: { type: "string" },
    before: { type: "string" },
    json: { default: false, type: "boolean" },
    only: { type: "string" },
    out: { type: "string" },
    quick: { default: false, type: "boolean" },
    target: { type: "string" },
    threshold: { type: "string" },
  },
});

const QUICK_PLAN = {
  ...DEFAULT_PLAN,
  batchesPerSuite: 1,
  casesPerSuite: 8,
  largeJournalEvents: 1500,
  suites: 2,
};

const serverSettings = {
  ...DEFAULT_SERVER_SETTINGS,
  ...(values.quick
    ? {
        coldStarts: 2,
        plan: QUICK_PLAN,
        requests: 90,
        sequential: 15,
        warmup: 5,
      }
    : {}),
  endpoints: values.only === undefined ? null : values.only.split(","),
};
const runnerSettings = values.quick
  ? { cliRuns: 1, reps: 2 }
  : DEFAULT_RUNNER_SETTINGS;
const webSettings = {
  ...DEFAULT_WEB_SETTINGS,
  ...(values.quick ? { plan: QUICK_PLAN, runs: 1 } : {}),
};

const SUITES: Readonly<
  Record<
    string,
    (targets: readonly string[]) => Promise<readonly SuiteResult[]>
  >
> = {
  runner: (targets) =>
    runRunnerSuite(HARNESS_ROOT, targets, runnerSettings, log),
  server: (targets) => runServerSuite(targets, serverSettings, log),
  web: (targets) => runWebSuite(targets, webSettings, log),
};

const git = (root: string, args: readonly string[]) =>
  execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();

const commitOf = (root: string) => {
  try {
    const sha = git(root, ["rev-parse", "--short", "HEAD"]);
    return git(root, ["status", "--porcelain"]).length > 0
      ? `${sha}-dirty`
      : sha;
  } catch {
    return "unknown";
  }
};

const hostOf = () =>
  `${cpus()[0]?.model ?? "cpu"} x${cpus().length}, ${Math.round(totalmem() / 2 ** 30)} GiB, bun ${Bun.version}`;

const readResult = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as ResultFile;

const writeResult = (path: string, file: ResultFile) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
};

const suitesOf = (name: string) => {
  const names = name === "all" ? ALL_SUITES : [name];
  const unknown = names.find((each) => SUITES[each] === undefined);
  if (unknown !== undefined) {
    throw new Error(`No suite called ${unknown}.\n${USAGE}`);
  }
  return names;
};

const measure = async (
  names: readonly string[],
  targets: readonly string[]
) => {
  const perTarget = targets.map((): SuiteResult[] => []);
  for (const name of names) {
    const results = await (
      SUITES[name] as (
        targets: readonly string[]
      ) => Promise<readonly SuiteResult[]>
    )(targets);
    for (const [index, result] of results.entries()) {
      perTarget[index]?.push(result);
    }
  }
  const recordedAt = new Date().toISOString();
  return targets.map(
    (target, index): ResultFile => ({
      commit: commitOf(target),
      host: hostOf(),
      recordedAt,
      suites: perTarget[index] ?? [],
      version: 1,
    })
  );
};

const stamp = () => new Date().toISOString().replaceAll(":", "-");

const runOne = async (name: string) => {
  const names = suitesOf(name);
  const [file] = await measure(names, [resolve(values.target ?? HARNESS_ROOT)]);
  if (file === undefined) {
    return;
  }
  const out = values.out ?? join(RESULTS, `${names.join("-")}-${stamp()}.json`);
  writeResult(out, file);
  log(
    values.json
      ? JSON.stringify(file, null, 2)
      : `\n${metricsTable(flatten(file))}\n\nwrote ${out}`
  );
};

const runCompare = (before: string | undefined, after: string | undefined) => {
  if (before === undefined || after === undefined) {
    throw new Error(USAGE);
  }
  const threshold = Number(values.threshold ?? DEFAULT_THRESHOLD_PERCENT);
  const comparisons = compare(
    before.split(",").map((path) => flatten(readResult(path))),
    after.split(",").map((path) => flatten(readResult(path))),
    threshold
  );
  const regressed = regressions(comparisons);
  if (values.json) {
    log(
      JSON.stringify(
        { comparisons, regressed: regressed.length, threshold },
        null,
        2
      )
    );
  } else {
    log(comparisonTable(comparisons));
    log(`\n${regressed.length} regressed beyond ${threshold}%`);
  }
  process.exitCode = regressed.length > 0 ? 1 : 0;
  return regressed.map((each) => each.key);
};

const measurePair = async (
  names: readonly string[],
  before: string,
  after: string
) => {
  const [beforeFile, afterFile] = await measure(names, [before, after]);
  const directory = join(RESULTS, `ab-${stamp()}`);
  const beforePath = join(directory, "before.json");
  const afterPath = join(directory, "after.json");
  writeResult(beforePath, beforeFile as ResultFile);
  writeResult(afterPath, afterFile as ResultFile);
  log(`\nbefore ${before}\nafter  ${after}\nresults in ${directory}\n`);
  return { afterPath, beforePath, flagged: runCompare(beforePath, afterPath) };
};

const suiteOfKey = (key: string) => key.slice(0, key.indexOf("."));

const runAb = async (name: string | undefined) => {
  if (name === undefined || values.before === undefined) {
    throw new Error(USAGE);
  }
  const before = resolve(values.before);
  const after = resolve(values.after ?? HARNESS_ROOT);
  const first = await measurePair(suitesOf(name), before, after);
  if (first.flagged.length === 0) {
    return;
  }
  log(
    `\n${first.flagged.length} flagged. Measuring those suites again and judging both passes pooled, so one noisy pass neither fails nor clears a change.\n`
  );
  const second = await measurePair(
    [...new Set(first.flagged.map(suiteOfKey))],
    before,
    after
  );
  log("\nboth passes pooled\n");
  const pooled = runCompare(
    `${first.beforePath},${second.beforePath}`,
    `${first.afterPath},${second.afterPath}`
  );
  log(
    `${pooled.length} regressed over both passes${pooled.length > 0 ? `: ${pooled.join(", ")}` : ""}`
  );
};

const [command, ...rest] = positionals;

if (command === "compare") {
  runCompare(rest[0], rest[1]);
} else if (command === "ab") {
  await runAb(rest[0]);
} else if (command === undefined) {
  log(USAGE);
  process.exitCode = 1;
} else {
  await runOne(command);
}
