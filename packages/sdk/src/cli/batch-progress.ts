import type { EvalTailEvent } from "@anpord/schema/domain/eval-tail";
import type { EvalBatch, EvalRun } from "@anpord/schema/domain/evals";
import { Effect, Ref } from "effect";
import { batchUsage, usageLines } from "./eval-usage";
import { note } from "./render";
import { makeTranscriber } from "./transcriber";
import type { Speaker } from "./transcript-turn";
import { terminalStyle } from "./transcript-writer";
import { formatVariant } from "./variant-label";

const DIM = "[2m";
const BOLD = "[1m";
const GREEN = "[32m";
const RED = "[31m";
const YELLOW = "[33m";
const RESET = "[0m";

const DONE = "●";
const RUNNING = "◐";
const FILLED = "▰";
const HOLLOW = "▱";

const PERCENT = 100;
const SECONDS = 1000;
const MINUTE = 60;

const paint = (colour: string, text: string) => `${colour}${text}${RESET}`;

const formatElapsed = (ms: number) => {
  const total = Math.floor(ms / SECONDS);
  const minutes = Math.floor(total / MINUTE);

  return minutes === 0
    ? `${total}s`
    : `${minutes}m${String(total % MINUTE).padStart(2, "0")}s`;
};

const formatStatus = (run: EvalRun) => {
  if (run.status === "finished") {
    return paint(GREEN, DONE);
  }

  return run.status === "failed" ? paint(RED, DONE) : paint(YELLOW, RUNNING);
};

const formatTrialProgress = (run: EvalRun, trials: number) => {
  const settled = run.trials.filter(
    (trial) => trial.status !== "queued" && trial.status !== "running"
  ).length;

  return `${FILLED.repeat(settled)}${paint(DIM, HOLLOW.repeat(Math.max(0, trials - settled)))}`;
};

const formatPassRate = (run: EvalRun) => {
  const rate = run.distribution.passRate;

  if (run.distribution.scored === 0) {
    return paint(DIM, "—");
  }

  const shown = `${Math.round(rate * PERCENT)}%`;

  return paint(rate === 1 ? GREEN : RED, shown);
};

const formatActivity = (run: EvalRun) => {
  const running = run.trials.find((trial) => trial.status === "running");

  if (running === undefined) {
    return [];
  }

  const counts = [
    `${running.commands} cmd`,
    ...(running.filesChanged.length === 0
      ? []
      : [`${running.filesChanged.length} files`]),
  ].join(", ");

  return [paint(DIM, `      ${counts}`)];
};

const widest = (batch: EvalBatch) =>
  batch.runs.reduce(
    (width, run) => Math.max(width, formatVariant(run.variant).length),
    0
  );

const byCase = (batch: EvalBatch) =>
  Map.groupBy(batch.runs, (run) => run.case.id).values();

export const formatBatch = (
  batch: EvalBatch,
  trials: number,
  elapsedMs: number
) => {
  const width = widest(batch);
  const lines: string[] = [];

  for (const runs of byCase(batch)) {
    lines.push(`  ${BOLD}${runs[0]?.case.name ?? ""}${RESET}`);

    for (const run of runs) {
      lines.push(
        `    ${formatStatus(run)} ${formatVariant(run.variant).padEnd(width)}  ${formatTrialProgress(run, trials)}  ${formatPassRate(run)}`
      );
      lines.push(...formatActivity(run));
    }

    lines.push("");
  }

  const usage = batchUsage(batch);
  const [spend, ...concerns] = usageLines(usage);

  lines.push(
    paint(
      DIM,
      spend === undefined
        ? `  ${formatElapsed(elapsedMs)} elapsed`
        : `  ${formatElapsed(elapsedMs)} elapsed  ·  ${spend}`
    )
  );

  for (const concern of concerns) {
    lines.push(paint(YELLOW, `  ${concern}`));
  }

  return lines;
};

const up = (rows: number) => `[${rows}A[0J`;

export type ProgressMode = "live" | "lines" | "silent";

const speakerOf = (
  batch: EvalBatch | null,
  runId: string,
  ordinal: number,
  trials: number
): Speaker => {
  const run = batch?.runs.find((one) => one.id === runId);

  return {
    caseName: run?.case.name ?? "trial",
    key: `${runId}#${ordinal}`,
    ordinal: trials > 1 ? ordinal : null,
    variant: run === undefined ? "" : formatVariant(run.variant),
  };
};

const hasSettled = (trial: EvalRun["trials"][number]) =>
  trial.status !== "queued" && trial.status !== "running";

const settledTrials = (batch: EvalBatch, trials: number) =>
  batch.runs.flatMap((run) =>
    run.trials.filter(hasSettled).map((trial) => ({
      speaker: speakerOf(batch, run.id, trial.ordinal, trials),
      verdict: trial,
    }))
  );

export const watchBatch = (trials: number, mode: ProgressMode) =>
  Effect.gen(function* () {
    const drawn = yield* Ref.make(0);
    const latest = yield* Ref.make<{
      readonly batch: EvalBatch;
      readonly elapsedMs: number;
    } | null>(null);
    const transcript = yield* makeTranscriber(terminalStyle(mode === "live"));

    const writing = yield* Effect.makeSemaphore(1);

    const print = (above: readonly string[]) =>
      Effect.gen(function* () {
        const held = yield* Ref.get(latest);
        const footer =
          mode === "live" && held !== null
            ? ["", ...formatBatch(held.batch, trials, held.elapsedMs)]
            : [];
        const rows = yield* Ref.getAndSet(drawn, footer.length);
        const lines = [...above, ...footer];

        if (lines.length > 0) {
          yield* note(`${rows === 0 ? "" : up(rows)}${lines.join("\n")}`);
        }
      }).pipe(writing.withPermits(1));

    const draw = (batch: EvalBatch, elapsedMs: number) =>
      Effect.gen(function* () {
        yield* Ref.set(latest, { batch, elapsedMs });

        yield* print(
          mode === "silent"
            ? []
            : yield* transcript.settle(settledTrials(batch, trials))
        );
      });

    const hear = (events: readonly EvalTailEvent[]) =>
      Effect.gen(function* () {
        if (mode === "silent") {
          return;
        }

        const batch = (yield* Ref.get(latest))?.batch ?? null;

        yield* print(
          yield* transcript.transcribe(
            events.map((event) => ({
              entry: event.entry,
              speaker: speakerOf(batch, event.run, event.ordinal, trials),
            }))
          )
        );
      });

    return { draw, hear };
  });

export const formatBatchSummary = (
  batch: EvalBatch,
  trials: number,
  drawn: boolean
) => (drawn ? "" : formatBatch(batch, trials, 0).join("\n"));
