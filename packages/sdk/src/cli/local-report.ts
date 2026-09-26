import type { EvalCosts } from "@anpord/schema/domain/evals";
import { Option } from "effect";
import { formatDuration } from "./duration";
import { localUsageLines } from "./eval-usage";
import type { LocalCase, LocalStatus } from "./local-trial-result";
import { outcomeMark } from "./outcome-mark";
import { type Palette, paletteFor } from "./paint";
import { note } from "./render";
import { terminalStyle } from "./transcript-writer";

const STATUSES: readonly LocalStatus[] = [
  "passed",
  "failed",
  "void",
  "timed out",
];

const trialName = (one: LocalCase, numbered: boolean) =>
  `${one.name} on ${one.variant}${numbered ? `, trial ${one.ordinal}` : ""}`;

const tallyOf = (cases: readonly LocalCase[]) =>
  STATUSES.flatMap((status) => {
    const count = cases.filter((one) => one.status === status).length;
    return count === 0 ? [] : [`${count} ${status}`];
  }).join(", ");

export const summaryLines = (
  label: string,
  cases: readonly LocalCase[],
  costs: EvalCosts | null,
  link: Option.Option<string>,
  paint: Palette = paletteFor(false)
): readonly string[] => {
  const numbered = cases.some((one) => one.ordinal > 1);
  const statusWidth = Math.max(...cases.map((one) => one.status.length), 0);
  const nameWidth = Math.max(
    ...cases.map((one) => trialName(one, numbered).length),
    0
  );
  const reasonIndent = " ".repeat(statusWidth + 6);

  return [
    `${paint.bold(label)}: ${[`${cases.length} ${cases.length === 1 ? "trial" : "trials"} on this machine`, tallyOf(cases)].filter((part) => part !== "").join(", ")}`,
    ...cases.flatMap((one) => [
      `  ${outcomeMark(one.status, paint)}${" ".repeat(statusWidth - one.status.length)}  ${trialName(one, numbered).padEnd(nameWidth)}  ${paint.dim(formatDuration(one.durationMs))}`,
      ...(one.reason === null ? [] : [`${reasonIndent}${one.reason}`]),
    ]),
    ...localUsageLines(cases, costs),
    ...Option.match(link, {
      onNone: () => [],
      onSome: (url) => [`  Results: ${url}`],
    }),
  ];
};

export const reportLocal = (
  label: string,
  cases: readonly LocalCase[],
  costs: EvalCosts | null,
  link: Option.Option<string>
) =>
  note(
    [
      "",
      ...summaryLines(
        label,
        cases,
        costs,
        link,
        paletteFor(terminalStyle(process.stderr.isTTY === true).colour)
      ),
    ].join("\n")
  );

export const localProblems = (
  label: string,
  cases: readonly LocalCase[]
): readonly string[] => {
  const missed = cases.filter((one) => one.status !== "passed").length;

  return missed === 0
    ? []
    : [`${label}: ${missed} of ${cases.length} trials did not pass.`];
};
