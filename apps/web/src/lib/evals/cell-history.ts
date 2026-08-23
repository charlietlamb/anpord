import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";
import { clock, dayOf } from "@/lib/evals/duration";

export type ReadingTone = "critical" | "pending" | "positive" | "running";

export interface Reading {
  readonly entry: EvalCellHistoryEntry;
  readonly title: string;
  readonly tone: ReadingTone;
}

const toneOf = (entry: EvalCellHistoryEntry): ReadingTone => {
  if (entry.finishedAt === null) {
    return "running";
  }

  const { passed, scored } = entry.distribution;

  if (scored === 0) {
    return "pending";
  }

  return passed === scored ? "positive" : "critical";
};

const rateOf = (entry: EvalCellHistoryEntry) =>
  entry.distribution.scored === 0
    ? "nothing scored"
    : `${entry.distribution.passed}/${entry.distribution.scored} passed`;

const same = (
  left: EvalCellHistoryEntry,
  right: EvalCellHistoryEntry
): boolean =>
  left.distribution.passed === right.distribution.passed &&
  left.distribution.scored === right.distribution.scored &&
  left.distribution.voided === right.distribution.voided;

export const readingsOf = (
  entries: readonly EvalCellHistoryEntry[]
): readonly Reading[] =>
  [...entries].reverse().map((entry) => ({
    entry,
    title:
      entry.finishedAt === null
        ? "running"
        : `${clock(entry.finishedAt.epochMillis)} · ${rateOf(entry)}`,
    tone: toneOf(entry),
  }));

export const summaryOf = (readings: readonly Reading[]): string => {
  const settled = readings.filter((reading) => reading.tone !== "running");
  const running = readings.length - settled.length;
  const tail = running > 0 ? `, ${running} running` : "";

  if (settled.length === 0) {
    return running === 1
      ? "One reading running."
      : `${running} readings running.`;
  }

  const changedAt = settled.findLastIndex(
    (reading, index) =>
      index > 0 && !same(reading.entry, settled[index - 1].entry)
  );

  const from = settled[changedAt === -1 ? 0 : changedAt];
  const since = from.entry.finishedAt;

  const spansOneDay =
    since !== null &&
    settled.at(-1)?.entry.finishedAt !== null &&
    dayOf(since.epochMillis) ===
      dayOf(settled.at(-1)?.entry.finishedAt?.epochMillis ?? 0);

  const when =
    since === null
      ? ""
      : ` since ${spansOneDay ? clock(since.epochMillis) : dayOf(since.epochMillis)}`;

  if (changedAt === -1) {
    return `Steady across ${settled.length} readings${when}${tail}.`;
  }

  return `Changed${when}, steady for ${settled.length - changedAt} since${tail}.`;
};
