import type {
  EvalCell,
  EvalComparison,
  EvalRun,
} from "@anpord/schema/domain/evals";
import { Option, Schema } from "effect";
import { variantOf } from "./eval-grid";
import type { EvalOutcome } from "./eval-outcome";

export const CheckRun = Schema.Struct({
  conclusion: Schema.Literal("failure", "neutral", "success"),
  details_url: Schema.optional(Schema.String),
  name: Schema.Literal("anpord"),
  output: Schema.Struct({ summary: Schema.String, title: Schema.String }),
});
export type CheckRun = typeof CheckRun.Type;

/** GitHub refuses a summary past this many characters. */
export const SUMMARY_LIMIT = 65_535;
const TRUNCATED = "\n\n… truncated";

const PERCENT = 100;
const ABSENT = "—";

const percent = (rate: number | undefined) =>
  rate === undefined ? ABSENT : `${Math.round(rate * PERCENT)}%`;

const rateOf = (cell: EvalCell) =>
  cell.distribution === null || cell.distribution.scored === 0
    ? ABSENT
    : percent(cell.distribution.passRate);

/* Read structurally rather than from the schema, so the clause appears once
   the server sends the versions and is omitted, not broken, until then. */
const versionsOf = (
  comparison: EvalComparison
): { readonly baseline?: string; readonly candidate?: string } => ({
  baseline:
    "baselineHarnessVersion" in comparison &&
    typeof comparison.baselineHarnessVersion === "string"
      ? comparison.baselineHarnessVersion
      : undefined,
  candidate:
    "candidateHarnessVersion" in comparison &&
    typeof comparison.candidateHarnessVersion === "string"
      ? comparison.candidateHarnessVersion
      : undefined,
});

const versionClause = (run: EvalRun, cell: EvalCell) => {
  if (cell.comparison === null) {
    return "";
  }

  const { baseline, candidate } = versionsOf(cell.comparison);
  const harness = run.tasks[cell.taskIndex]?.harness ?? "harness";

  return baseline === undefined ||
    candidate === undefined ||
    baseline === candidate
    ? ""
    : ` (${harness} ${baseline} → ${candidate})`;
};

const verdictOf = (run: EvalRun, cell: EvalCell) =>
  cell.comparison === null
    ? ABSENT
    : `${cell.comparison.verdict}${versionClause(run, cell)}`;

const escaped = (text: string) => text.replaceAll("|", "\\|");

const rowOf = (run: EvalRun, cell: EvalCell) =>
  `| ${escaped(cell.caseName)} | ${escaped(variantOf(run, cell))} | ${rateOf(cell)} | ${percent(cell.comparison?.baselinePassRate)} | ${verdictOf(run, cell)} |`;

const tableOf = (file: string, run: EvalRun) =>
  [
    `### ${escaped(file)}`,
    "",
    ...(run.failure === null ? [] : [`Run failed: ${run.failure}`, ""]),
    "| Case | Variant | Pass rate | Baseline | Verdict |",
    "| --- | --- | --- | --- | --- |",
    ...run.cells.map((cell) => rowOf(run, cell)),
  ].join("\n");

const truncated = (summary: string) =>
  summary.length < SUMMARY_LIMIT
    ? summary
    : `${summary.slice(0, SUMMARY_LIMIT - TRUNCATED.length - 1)}${TRUNCATED}`;

const conclusionOf = (cells: readonly EvalCell[]): CheckRun["conclusion"] => {
  const verdicts = cells.flatMap((cell) =>
    cell.comparison === null ? [] : [cell.comparison.verdict]
  );

  if (verdicts.includes("regressed")) {
    return "failure";
  }

  return verdicts.every((verdict) => verdict === "incomparable")
    ? "neutral"
    : "success";
};

const TITLES: Record<CheckRun["conclusion"], string> = {
  failure: "A cell regressed against its baseline",
  neutral: "Nothing to compare against a baseline",
  success: "No cell regressed against its baseline",
};

export const checkRunOf = (
  outcomes: readonly EvalOutcome[],
  webUrl: string
): CheckRun => {
  const finished = outcomes.flatMap((outcome) =>
    Option.match(outcome.run, {
      onNone: () => [],
      onSome: (run) => [{ file: outcome.file, run }],
    })
  );
  const conclusion = conclusionOf(finished.flatMap(({ run }) => run.cells));
  const first = finished[0];

  return {
    conclusion,
    details_url:
      first === undefined ? undefined : `${webUrl}/evals/${first.run.id}`,
    name: "anpord",
    output: {
      summary: truncated(
        finished.map(({ file, run }) => tableOf(file, run)).join("\n\n")
      ),
      title: TITLES[conclusion],
    },
  };
};
