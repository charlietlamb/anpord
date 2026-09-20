import type { EvalCell, EvalRun } from "@anpord/schema/domain/evals";
import { Effect, Ref } from "effect";
import { runUsage, usageLines } from "./eval-usage";
import { note } from "./render";

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

const TAIL = 56;

const clip = (text: string) => {
  const flat = text.replace(/\s+/g, " ").trim();

  return flat.length > TAIL ? `${flat.slice(0, TAIL - 1)}…` : flat;
};

const latestOf = (cell: EvalCell) => {
  const running = cell.trials.find((trial) => trial.status === "running");
  const entry = running?.trajectory.at(-1);

  if (entry === undefined) {
    return;
  }

  if (entry._tag === "command") {
    return clip(entry.command);
  }

  if (entry._tag === "toolCall") {
    return clip(entry.name);
  }

  return entry._tag === "fileChange"
    ? clip(entry.paths.join(" "))
    : clip(entry.text);
};

/* A trial runs for minutes behind one pip, so without what the agent is doing
   the grid reads as a hang. */
const formatActivity = (cell: EvalCell) => {
  const running = cell.trials.find((trial) => trial.status === "running");

  if (running === undefined) {
    return [];
  }

  const latest = latestOf(cell);
  const counts = [
    `${running.commands} cmd`,
    ...(running.filesChanged.length === 0
      ? []
      : [`${running.filesChanged.length} files`]),
  ].join(", ");

  return [
    paint(DIM, `      ${counts}${latest === undefined ? "" : `  ${latest}`}`),
  ];
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

export const liveGrid = (trials: number, interactive: boolean) =>
  Effect.gen(function* () {
    const drawn = yield* Ref.make(0);

    return (run: EvalRun, elapsedMs: number) =>
      Effect.gen(function* () {
        if (!interactive) {
          return;
        }

        const rows = yield* Ref.getAndSet(drawn, 0);
        const lines = formatGrid(run, trials, elapsedMs);

        yield* note(`${rows === 0 ? "" : up(rows)}${lines.join("\n")}`);
        yield* Ref.set(drawn, lines.length);
      });
  });

export const formatGridSummary = (
  run: EvalRun,
  trials: number,
  drawn: boolean
) => (drawn ? "" : formatGrid(run, trials, 0).join("\n"));
