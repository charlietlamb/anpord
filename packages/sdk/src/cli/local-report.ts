import { Effect } from "effect";
import type { LocalCase } from "./eval-local";
import { localUsageLines } from "./eval-usage";
import { note } from "./render";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

const trialName = (one: LocalCase) =>
  `${one.name} on ${one.variant}, trial ${one.ordinal}`;

export const reportLocal = (label: string, cases: readonly LocalCase[]) =>
  Effect.forEach(
    [
      `${label}: ${cases.length} trial(s) on this machine`,
      ...cases.map(
        (one) => `  ${one.status} ${trialName(one)} ${seconds(one.durationMs)}`
      ),
      ...localUsageLines(cases),
    ],
    note
  );

export const localProblems = (cases: readonly LocalCase[]) =>
  cases.flatMap((one) =>
    one.status === "passed" ? [] : [`${trialName(one)}: ${one.status}.`]
  );
