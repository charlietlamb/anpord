import type { EvalCosts } from "@anpord/schema/domain/eval-costs";
import { Option } from "effect";
import { formatDuration } from "./duration";
import { localUsage } from "./eval-usage";
import { continued, labelled } from "./labelled-row";
import type { LocalCase, LocalStatus } from "./local-trial-result";
import { outcomeGlyph, outcomeTone } from "./outcome-mark";
import { type Palette, paletteFor } from "./paint";
import { note } from "./render";
import { stderrStyle } from "./transcript-writer";

const STATUSES: readonly LocalStatus[] = [
  "failed",
  "timed out",
  "void",
  "passed",
];

const trialName = (one: LocalCase, numbered: boolean) =>
  numbered ? `${one.name} #${one.ordinal}` : one.name;

const tallyOf = (cases: readonly LocalCase[], paint: Palette) => {
  const counts = STATUSES.flatMap((status) => {
    const count = cases.filter((one) => one.status === status).length;
    return count === 0
      ? []
      : [outcomeTone(status, paint)(`${count} ${status}`)];
  });

  return `${counts.join(paint.dim(" | "))} ${paint.dim(`(${cases.length})`)}`;
};

const trialLines = (
  cases: readonly LocalCase[],
  paint: Palette
): readonly string[] => {
  const numbered = cases.some((one) => one.ordinal > 1);
  const nameWidth = Math.max(
    ...cases.map((one) => trialName(one, numbered).length)
  );
  const variantWidth = Math.max(...cases.map((one) => one.variant.length));

  return cases.flatMap((one) => [
    `  ${outcomeGlyph(one.status, paint)} ${trialName(one, numbered).padEnd(nameWidth)}  ${paint.dim(one.variant.padEnd(variantWidth))}  ${paint.dim(formatDuration(one.durationMs))}`,
    ...(one.reason === null
      ? []
      : [
          `    ${outcomeTone(one.status, paint)(one.status)} ${paint.dim(`· ${one.reason}`)}`,
        ]),
  ]);
};

const usageRows = (
  cases: readonly LocalCase[],
  costs: EvalCosts | null,
  paint: Palette
) => {
  const { concerns, lines } = localUsage(cases, costs);
  const [first, ...rest] = lines;

  return first === undefined
    ? []
    : [
        labelled("Usage", first, paint),
        ...rest.map(continued),
        ...concerns.map((concern) => continued(paint.yellow(`⚠ ${concern}`))),
      ];
};

export const summaryLines = (
  label: string,
  cases: readonly LocalCase[],
  costs: EvalCosts | null,
  link: Option.Option<string>,
  paint: Palette = paletteFor(false)
): readonly string[] => [
  ...(cases.length === 0 ? [] : [...trialLines(cases, paint), ""]),
  labelled("Suite", label, paint),
  labelled(
    "Trials",
    cases.length === 0 ? "none ran" : tallyOf(cases, paint),
    paint
  ),
  ...usageRows(cases, costs, paint),
  ...Option.match(link, {
    onNone: () => [],
    onSome: (url) => [labelled("Results", url, paint)],
  }),
];

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
        paletteFor(stderrStyle().colour)
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
