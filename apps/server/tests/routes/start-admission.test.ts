import { describe, expect, it } from "bun:test";
import { RunQuery } from "@anpord/eval/repositories/run-query";
import {
  MAX_ORGANIZATION_RUNS_IN_FLIGHT,
  MAX_RUN_TRIALS,
} from "@anpord/schema/domain/eval-quota";
import { Effect, Layer, Option } from "effect";
import { admitStart } from "../../src/routes/internal/evals/start-admission";

const task = (model: string) => ({
  harness: "codex",
  model,
  provider: "upstash",
});

const start = (input: {
  readonly cases: number;
  readonly tasks: readonly ReturnType<typeof task>[];
  readonly trials: number;
}) => ({
  cases: Array.from({ length: input.cases }, () => ({})),
  tasks: input.tasks,
  trials: input.trials,
});

/** Only `countRunning` is reached; the rest stand in so the tag can be
 * provided at all. */
const withRunning = (running: number) =>
  Layer.succeed(
    RunQuery,
    RunQuery.of({
      countRunning: () => Effect.succeed(running),
      countRuns: () => Effect.succeed(running),
      findCellHistory: () => Effect.succeed([]),
      findCellTask: () => Effect.succeed(Option.none()),
      findRun: () => Effect.succeed(Option.none()),
      findRunTasks: () => Effect.succeed([]),
      hydrateRuns: () => Effect.succeed([]),
      listRuns: () => Effect.succeed([]),
    })
  );

/** The refusal's message, or null where the start was admitted. */
const refusalOf = (payload: ReturnType<typeof start>, running = 0) =>
  Effect.runSync(
    admitStart("org_1", payload).pipe(
      Effect.provide(withRunning(running)),
      Effect.map(() => null),
      Effect.catchAll((refusal) => Effect.succeed(refusal.message))
    )
  );

describe("what a start is admitted for", () => {
  it("accepts a grid inside every limit", () => {
    expect(refusalOf(start({ cases: 2, tasks: [task("a")], trials: 3 }))).toBe(
      null
    );
  });

  /* Cells run eight at a time and each cell runs up to ten trials, so an
     unbounded start can want scores of simultaneous VMs. Refused before
     `grid.start`, so nothing is opened and no run row is written. */
  it("refuses a start asking for more trials than a run may hold", () => {
    const refusal = refusalOf(
      start({ cases: MAX_RUN_TRIALS, tasks: [task("a"), task("b")], trials: 1 })
    );

    expect(refusal).toContain(String(MAX_RUN_TRIALS));
    expect(refusal).toContain(String(MAX_RUN_TRIALS * 2));
  });

  it("accepts a start sitting exactly on the trial cap", () => {
    expect(
      refusalOf(start({ cases: MAX_RUN_TRIALS, tasks: [task("a")], trials: 1 }))
    ).toBe(null);
  });

  /* The trial cap bounds one run; nothing bounded the number of runs, and
     nothing about starting one is slow enough to make starting many hard. */
  it("refuses a start when the organization already has its runs going", () => {
    expect(
      refusalOf(
        start({ cases: 1, tasks: [task("a")], trials: 1 }),
        MAX_ORGANIZATION_RUNS_IN_FLIGHT
      )
    ).toContain(String(MAX_ORGANIZATION_RUNS_IN_FLIGHT));
  });

  it("admits again once one of those runs has settled", () => {
    expect(
      refusalOf(
        start({ cases: 1, tasks: [task("a")], trials: 1 }),
        MAX_ORGANIZATION_RUNS_IN_FLIGHT - 1
      )
    ).toBe(null);
  });

  it("still refuses two tasks naming the same column", () => {
    expect(
      refusalOf(start({ cases: 1, tasks: [task("a"), task("a")], trials: 1 }))
    ).toContain("unique");
  });
});
