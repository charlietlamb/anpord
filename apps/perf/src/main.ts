import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, totalmem } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { runAb } from "./ab";
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

const USAGE = `usage:
  bun run perf <server|runner|web|all> [--quick] [--target <checkout>] [--out <file>] [--json] [--only <endpoint,...>]
  bun run perf compare <before.json[,more.json]> <after.json[,more.json]> [--threshold <percent>]
  bun run perf ab <server|runner|web|all> --before <checkout> [--after <checkout>] [--rounds <n>] [--quick] [--threshold <percent>]`;

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
    rounds: { type: "string" },
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
        requests: 60,
        sequential: 10,
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

const targetRoot = resolve(values.target ?? HARNESS_ROOT);

const SUITES: Readonly<Record<string, () => Promise<SuiteResult>>> = {
  runner: () => runRunnerSuite(HARNESS_ROOT, targetRoot, runnerSettings, log),
  server: () => runServerSuite(targetRoot, serverSettings, log),
  web: () => runWebSuite(targetRoot, webSettings, log),
};

const commitOf = (root: string) => {
  try {
    const sha = execFileSync(
      "git",
      ["-C", root, "rev-parse", "--short", "HEAD"],
      { encoding: "utf8" }
    ).trim();
    const dirty = execFileSync("git", ["-C", root, "status", "--porcelain"], {
      encoding: "utf8",
    }).trim();
    return dirty.length > 0 ? `${sha}-dirty` : sha;
  } catch {
    return "unknown";
  }
};

const hostOf = () =>
  `${cpus()[0]?.model ?? "cpu"} x${cpus().length}, ${Math.round(totalmem() / 2 ** 30)} GiB, bun ${Bun.version}`;

const readResult = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as ResultFile;

const runSuites = async (names: readonly string[]) => {
  const suites: SuiteResult[] = [];
  for (const name of names) {
    const run = SUITES[name];
    if (run === undefined) {
      throw new Error(`No suite called ${name}.\n${USAGE}`);
    }
    suites.push(await run());
  }
  const file: ResultFile = {
    commit: commitOf(targetRoot),
    host: hostOf(),
    recordedAt: new Date().toISOString(),
    suites,
    version: 1,
  };
  const out =
    values.out ??
    join(
      RESULTS,
      `${names.join("-")}-${file.recordedAt.replaceAll(":", "-")}.json`
    );
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(file, null, 2)}\n`);

  if (values.json) {
    log(JSON.stringify(file, null, 2));
    return;
  }
  log(`\n${metricsTable(flatten(file))}\n\nwrote ${out}`);
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
};

const DEFAULT_ROUNDS = 2;

const suitesOf = (name: string) =>
  name === "all" ? ["server", "runner", "web"] : [name];

const runAbCommand = (suite: string | undefined) => {
  if (suite === undefined || values.before === undefined) {
    throw new Error(USAGE);
  }
  const directory = join(
    RESULTS,
    `ab-${new Date().toISOString().replaceAll(":", "-")}`
  );
  const files = runAb({
    after: values.after ?? HARNESS_ROOT,
    before: values.before,
    directory,
    quick: values.quick === true,
    rounds: Number(values.rounds ?? DEFAULT_ROUNDS),
    suite,
  });
  log(
    `\nbefore ${values.before}, after ${values.after ?? HARNESS_ROOT}, results in ${directory}\n`
  );
  runCompare(files.before.join(","), files.after.join(","));
};

const [command, ...rest] = positionals;

if (command === "compare") {
  runCompare(rest[0], rest[1]);
} else if (command === "ab") {
  runAbCommand(rest[0]);
} else if (command === undefined) {
  log(USAGE);
  process.exitCode = 1;
} else {
  await runSuites(suitesOf(command));
}
