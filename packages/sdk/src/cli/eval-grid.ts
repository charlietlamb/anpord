import type { EvalCell, EvalRun } from "@anpord/schema/domain/evals";
import { Effect, Ref } from "effect";
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

const elapsedOf = (ms: number) => {
  const total = Math.floor(ms / SECONDS);
  const minutes = Math.floor(total / MINUTE);

  return minutes === 0
    ? `${total}s`
    : `${minutes}m${String(total % MINUTE).padStart(2, "0")}s`;
};

const markOf = (cell: EvalCell) => {
  if (cell.status === "finished") {
    return paint(GREEN, DONE);
  }

  return cell.status === "failed" ? paint(RED, DONE) : paint(YELLOW, RUNNING);
};

const trialsOf = (cell: EvalCell, trials: number) => {
  const settled = cell.trials.filter(
    (trial) => trial.status !== "queued" && trial.status !== "running"
  ).length;

  return `${FILLED.repeat(settled)}${paint(DIM, HOLLOW.repeat(Math.max(0, trials - settled)))}`;
};

const rateOf = (cell: EvalCell) => {
  const rate = cell.distribution?.passRate;

  if (rate === undefined || cell.distribution?.scored === 0) {
    return paint(DIM, "—");
  }

  const shown = `${Math.round(rate * PERCENT)}%`;

  return paint(rate === 1 ? GREEN : RED, shown);
};

const variantOf = (run: EvalRun, cell: EvalCell) => {
  const task = run.tasks[cell.taskIndex];

  return task === undefined ? "?" : `${task.harness}/${task.model}`;
};

const widest = (run: EvalRun) =>
  run.cells.reduce(
    (width, cell) => Math.max(width, variantOf(run, cell).length),
    0
  );

export const gridOf = (run: EvalRun, trials: number, elapsedMs: number) => {
  const width = widest(run);
  const lines: string[] = [];

  for (const caseName of run.cases) {
    lines.push(`  ${BOLD}${caseName}${RESET}`);

    for (const cell of run.cells.filter((one) => one.caseName === caseName)) {
      lines.push(
        `    ${markOf(cell)} ${variantOf(run, cell).padEnd(width)}  ${trialsOf(cell, trials)}  ${rateOf(cell)}`
      );
    }

    lines.push("");
  }

  lines.push(paint(DIM, `  ${elapsedOf(elapsedMs)} elapsed`));

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
        const lines = gridOf(run, trials, elapsedMs);

        yield* note(`${rows === 0 ? "" : up(rows)}${lines.join("\n")}`);
        yield* Ref.set(drawn, lines.length);
      });
  });

export const summaryOf = (run: EvalRun, trials: number, drawn: boolean) =>
  drawn ? "" : gridOf(run, trials, 0).join("\n");
