import type { EvalRun } from "@anpord/schema/domain/evals";
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

const formatRunRow = (run: EvalRun) => {
  const rate = run.distribution.scored ? run.distribution.passRate : undefined;
  return `| ${escaped(run.case.name)} | ${escaped(formatVariant(run))} | ${percent(rate)} |`;
};

export const batchUrl = (webUrl: string, id: string) =>
  `${webUrl.replace(TRAILING_SLASH, "")}/evals/${encodeURIComponent(id)}`;

const formatOutcome = (
  { batch, batchId, file, problems }: EvalOutcome,
  webUrl: string
) =>
  [
    `### ${escaped(file)}`,
    "",
    ...(batchId === null
      ? []
      : [`[View batch](${batchUrl(webUrl, batchId)})`, ""]),
    ...problems.map((problem) => `- ${escaped(problem)}`),
    ...(batch === null
      ? []
      : [
          "",
          "| Case | Variant | Pass rate |",
          "| --- | --- | --- |",
          ...batch.runs.map(formatRunRow),
        ]),
  ].join("\n");

export const buildGithubCheck = (
  outcomes: readonly EvalOutcome[],
  webUrl: string
): CheckRun => {
  const failed = outcomes.some((outcome) => outcome.problems.length > 0);
  const completed =
    outcomes.length > 0 && outcomes.every((outcome) => outcome.batch !== null);
  const first = outcomes.find((outcome) => outcome.batchId !== null);
  const settled = completed ? "success" : "neutral";
  const conclusion = failed ? "failure" : settled;
  const summary = outcomes
    .map((outcome) => formatOutcome(outcome, webUrl))
    .join("\n\n");
  return {
    conclusion,
    details_url: first?.batchId ? batchUrl(webUrl, first.batchId) : undefined,
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
