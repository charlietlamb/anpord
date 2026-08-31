import { describe, expect, test } from "bun:test";
import { Effect, Layer, Option, Redacted, Ref } from "effect";
import { CredentialResolver } from "../../src/credentials/connections";
import { GridRun, type ResumeGrid } from "../../src/grid/run";
import { RunQuery } from "../../src/repositories/run-query";
import { ResumeRuns, ResumeRunsLive } from "../../src/services/resume-run";

const CELL = {
  cell: {
    harness: "codex",
    harnessCredentialConnectionId: "conn",
    harnessVersion: "1",
    model: "gpt-5.6-sol",
    provider: "daytona",
    runInternalId: "run-internal",
    sandboxCredentialConnectionId: null,
    taskInternalId: "task-internal",
  },
  identity: "task-public",
  name: "adds a test",
  prepareName: null,
  prepareSource: null,
  prompt: "{{task}}",
  source: { kind: "empty" },
  validatorName: null,
  validatorSource: null,
  verifyCommand: "true",
};

type RunStatus = "running" | "finished" | "failed";

const stubsFor = (
  status: RunStatus,
  seen: Ref.Ref<ResumeGrid | null>,
  cells: readonly unknown[]
) =>
  Layer.mergeAll(
    Layer.succeed(RunQuery, {
      findRunTasks: () => Effect.succeed(cells),
    } as never),
    Layer.succeed(GridRun, {
      get: () => Effect.succeed(Option.some({ status })),
      resume: (grid: ResumeGrid) => Ref.set(seen, grid),
    } as never),
    Layer.succeed(CredentialResolver, {
      resolve: () =>
        Effect.succeed(Redacted.make({ revision: 1, values: {} }) as never),
    } as never)
  );

const resuming = (
  status: RunStatus = "failed",
  cells: readonly unknown[] = [CELL]
) =>
  Effect.gen(function* () {
    const seen = yield* Ref.make<ResumeGrid | null>(null);

    const outcome = yield* Effect.gen(function* () {
      const runs = yield* ResumeRuns;

      return yield* runs.resume({
        actor: { organizationId: "org" } as never,
        legacyHarnessAuth: "legacy",
        runId: "run_1",
      });
    }).pipe(
      Effect.provide(
        ResumeRunsLive.pipe(Layer.provide(stubsFor(status, seen, cells)))
      ),
      Effect.either
    );

    return { outcome, resumed: yield* Ref.get(seen) };
  });

const resumedGrid = resuming().pipe(
  Effect.map(({ resumed }) => resumed as ResumeGrid)
);

const attempt = (status: RunStatus, cells: readonly unknown[] = [CELL]) =>
  Effect.runPromise(resuming(status, cells) as never) as Promise<{
    outcome: { readonly _tag: string };
    resumed: ResumeGrid | null;
  }>;

describe("resuming a run that is already registered", () => {
  test("continues the run it was given rather than starting another", async () => {
    const grid = await Effect.runPromise(resumedGrid as never);

    expect((grid as ResumeGrid).created).toEqual({
      id: "run_1",
      internalId: "run-internal",
    });
  });

  test("rebuilds the tasks that were registered for it", async () => {
    const grid = await Effect.runPromise(resumedGrid as never);

    expect((grid as ResumeGrid).registered).toEqual([
      { id: "task-public", internalId: "task-internal" },
    ]);
  });

  test("rebuilds the case from what was stored", async () => {
    const grid = await Effect.runPromise(resumedGrid as never);

    expect((grid as ResumeGrid).input.cases[0]?.name).toBe("adds a test");
  });
});

describe("resuming a run that should not be resumed", () => {
  test("refuses one that is still running, rather than doubling its cells", async () => {
    const { outcome, resumed } = await attempt("running");

    expect(outcome._tag).toBe("Left");
    expect(resumed).toBeNull();
  });

  test("refuses a run with no cells to continue", async () => {
    const { outcome } = await attempt("failed", []);

    expect(outcome._tag).toBe("Left");
  });
});

const cellFor = (caseName: string, model: string) => ({
  ...CELL,
  cell: { ...CELL.cell, model, taskInternalId: `internal-${caseName}` },
  identity: `id-${caseName}`,
  name: caseName,
});

/* Two cases across two models: four stored cells, and a grid that is their
   product rather than their count. */
const SQUARE = [
  cellFor("a", "gpt-5"),
  cellFor("b", "gpt-5"),
  cellFor("a", "claude"),
  cellFor("b", "claude"),
];

describe("rebuilding the grid a run was", () => {
  test("runs the cells it stored, rather than their square", async () => {
    const { resumed } = await attempt("failed", SQUARE);
    const grid = resumed as ResumeGrid;

    expect(grid.input.cases).toHaveLength(2);
    expect(grid.input.tasks).toHaveLength(2);
    expect(grid.input.cases.length * grid.input.tasks.length).toBe(
      SQUARE.length
    );
  });

  test("names each case once, so the grid can index them", async () => {
    const { resumed } = await attempt("failed", SQUARE);

    expect((resumed as ResumeGrid).registered.map((row) => row.id)).toEqual([
      "id-a",
      "id-b",
    ]);
  });
});
