import type { EvalCell, EvalRun } from "@anpord/schema/domain/evals";
import { Schema } from "effect";
import { formatVariant } from "./eval-grid";
import type { EvalOutcome } from "./eval-outcome";

export const CheckRun = Schema.Struct({
  conclusion: Schema.Literal("failure", "neutral", "success"),
  details_url: Schema.optional(Schema.String),
  name: Schema.Literal("anpord"),
  output: Schema.Struct({ summary: Schema.String, title: Schema.String }),
});
export type CheckRun = typeof CheckRun.Type;

export const SUMMARY_LIMIT = 65_535;
const TRUNCATED = "\n\n… truncated";
const TRAILING_SLASH = /\/$/;
const TITLES = {
  failure: "Eval gate failed",
  success: "Eval gate passed",
  neutral: "Evals still running",
};
const percent = (rate: number | undefined) =>
  rate === undefined ? "-" : `${Math.round(rate * 100)}%`;
const escaped = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "\\|")
    .replaceAll(/[\r\n]/g, " ");

const formatComparison = (run: EvalRun, cell: EvalCell) => {
  const comparison = cell.comparison;
  if (comparison === null) {
    return "-";
  }
  const { baselineHarnessVersion: before, candidateHarnessVersion: after } =
    comparison;
  const changed =
    before === after
      ? ""
      : ` (${run.tasks[cell.taskIndex]?.harness} ${before} → ${after})`;
  return `${comparison.verdict}${changed}`;
};

const formatCellRow = (run: EvalRun, cell: EvalCell) => {
  const rate = cell.distribution?.scored
    ? cell.distribution.passRate
    : undefined;
  return `| ${escaped(cell.caseName)} | ${escaped(formatVariant(run, cell))} | ${percent(rate)} | ${percent(cell.comparison?.baselinePassRate)} | ${escaped(formatComparison(run, cell))} |`;
};

export const runUrl = (webUrl: string, id: string) =>
  `${webUrl.replace(TRAILING_SLASH, "")}/evals/${encodeURIComponent(id)}`;

const formatOutcome = (
  { file, problems, run, runId }: EvalOutcome,
  webUrl: string
) =>
  [
    `### ${escaped(file)}`,
    "",
    ...(runId === null ? [] : [`[View run](${runUrl(webUrl, runId)})`, ""]),
    ...problems.map((problem) => `- ${escaped(problem)}`),
    ...(run === null
      ? []
      : [
          "",
          "| Case | Variant | Pass rate | Baseline | Verdict |",
          "| --- | --- | --- | --- | --- |",
          ...run.cells.map((cell) => formatCellRow(run, cell)),
        ]),
  ].join("\n");

export const buildGithubCheck = (
  outcomes: readonly EvalOutcome[],
  webUrl: string
): CheckRun => {
  const failed = outcomes.some((outcome) => outcome.problems.length > 0);
  const completed =
    outcomes.length > 0 && outcomes.every((outcome) => outcome.run !== null);
  const first = outcomes.find((outcome) => outcome.runId !== null);
  const settled = completed ? "success" : "neutral";
  const conclusion = failed ? "failure" : settled;
  const summary = outcomes
    .map((outcome) => formatOutcome(outcome, webUrl))
    .join("\n\n");
  return {
    conclusion,
    details_url: first?.runId ? runUrl(webUrl, first.runId) : undefined,
    name: "anpord",
    output: {
      title: TITLES[conclusion],
      summary:
        summary.length < SUMMARY_LIMIT
          ? summary
          : `${summary.slice(0, SUMMARY_LIMIT - TRUNCATED.length - 1)}${TRUNCATED}`,
    },
  };
};
