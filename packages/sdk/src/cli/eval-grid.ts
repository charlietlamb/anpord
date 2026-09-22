import type { EvalTailEvent } from "@anpord/schema/domain/eval-tail";
import type { EvalCell, EvalRun } from "@anpord/schema/domain/evals";
import { Effect, Ref } from "effect";
import { runUsage, usageLines } from "./eval-usage";
import { note } from "./render";
import {
  EMPTY_TRANSCRIPT,
  type Spoken,
  settle,
  terminalStyle,
  transcribe,
} from "./transcript";

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

const formatStatus = (cell: EvalCell) => {
  if (cell.status === "finished") {
    return paint(GREEN, DONE);
  }

  return cell.status === "failed" ? paint(RED, DONE) : paint(YELLOW, RUNNING);
};

const formatTrialProgress = (cell: EvalCell, trials: number) => {
  const settled = cell.trials.filter(
    (trial) => trial.status !== "queued" && trial.status !== "running"
  ).length;

  return `${FILLED.repeat(settled)}${paint(DIM, HOLLOW.repeat(Math.max(0, trials - settled)))}`;
};

const formatPassRate = (cell: EvalCell) => {
  const rate = cell.distribution?.passRate;

  if (rate === undefined || cell.distribution?.scored === 0) {
    return paint(DIM, "—");
  }

  const shown = `${Math.round(rate * PERCENT)}%`;

  return paint(rate === 1 ? GREEN : RED, shown);
};

/* A trial runs for minutes behind one pip, so without what the agent is doing
   the grid reads as a hang. */
const formatActivity = (cell: EvalCell) => {
  const running = cell.trials.find((trial) => trial.status === "running");

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

export const formatVariant = (run: EvalRun, cell: EvalCell) => {
  const task = run.tasks[cell.taskIndex];

  return task === undefined ? "?" : `${task.harness}/${task.model}`;
};

const widest = (run: EvalRun) =>
  run.cells.reduce(
    (width, cell) => Math.max(width, formatVariant(run, cell).length),
    0
  );

export const formatGrid = (run: EvalRun, trials: number, elapsedMs: number) => {
  const width = widest(run);
  const lines: string[] = [];

  for (const caseName of run.cases) {
    lines.push(`  ${BOLD}${caseName}${RESET}`);

    for (const cell of run.cells.filter((one) => one.caseName === caseName)) {
      lines.push(
        `    ${formatStatus(cell)} ${formatVariant(run, cell).padEnd(width)}  ${formatTrialProgress(cell, trials)}  ${formatPassRate(cell)}`
      );
      lines.push(...formatActivity(cell));
    }

    lines.push("");
  }

  const usage = runUsage(run);
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

export type GridMode = "grid" | "lines" | "silent";

const trialKey = (cell: string, ordinal: number) => `${cell}#${ordinal}`;

const spokenOf = (
  events: readonly EvalTailEvent[],
  run: EvalRun | null,
  trials: number
): readonly Spoken[] =>
  events.map((event) => {
    const cell = run?.cells.find((one) => one.internalId === event.cell);

    return {
      entry: event.entry,
      speaker: {
        caseName: cell?.caseName ?? "trial",
        key: trialKey(event.cell, event.ordinal),
        ordinal: trials > 1 ? event.ordinal : null,
        variant:
          run == null || cell === undefined ? "" : formatVariant(run, cell),
      },
    };
  });

const hasSettled = (trial: EvalCell["trials"][number]) =>
  trial.status !== "queued" && trial.status !== "running";

const settledTrials = (run: EvalRun) =>
  run.cells.flatMap(({ internalId, trials }) =>
    internalId === null
      ? []
      : trials
          .filter(hasSettled)
          .map((trial) => trialKey(internalId, trial.ordinal))
  );

export const liveGrid = (trials: number, mode: GridMode) =>
  Effect.gen(function* () {
    const drawn = yield* Ref.make(0);
    const latest = yield* Ref.make<{
      readonly elapsedMs: number;
      readonly run: EvalRun;
    } | null>(null);
    const style = terminalStyle(mode === "grid");
    const transcript = yield* Ref.make(EMPTY_TRANSCRIPT);

    const writing = yield* Effect.makeSemaphore(1);

    const print = (above: readonly string[]) =>
      Effect.gen(function* () {
        const held = yield* Ref.get(latest);
        const footer =
          mode === "grid" && held !== null
            ? ["", ...formatGrid(held.run, trials, held.elapsedMs)]
            : [];
        const rows = yield* Ref.getAndSet(drawn, footer.length);
        const lines = [...above, ...footer];

        if (lines.length > 0) {
          yield* note(`${rows === 0 ? "" : up(rows)}${lines.join("\n")}`);
        }
      }).pipe(writing.withPermits(1));

    const draw = (run: EvalRun, elapsedMs: number) =>
      Effect.gen(function* () {
        yield* Ref.set(latest, { elapsedMs, run });

        const closed =
          mode === "silent"
            ? []
            : yield* Ref.modify(transcript, (held) => {
                const next = settle(held, settledTrials(run), style);

                return [next.lines, next.transcript];
              });

        yield* print(closed);
      });

    const hear = (events: readonly EvalTailEvent[]) =>
      Effect.gen(function* () {
        if (mode === "silent") {
          return;
        }

        const run = (yield* Ref.get(latest))?.run ?? null;
        const lines = yield* Ref.modify(transcript, (held) => {
          const next = transcribe(held, spokenOf(events, run, trials), style);

          return [next.lines, next.transcript];
        });

        yield* print(lines);
      });

    return { draw, hear };
  });

export const formatGridSummary = (
  run: EvalRun,
  trials: number,
  drawn: boolean
) => (drawn ? "" : formatGrid(run, trials, 0).join("\n"));
