import { describe, expect, test } from "bun:test";
import { Effect, Layer, Redacted, Ref } from "effect";
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

const resumedGrid = Effect.gen(function* () {
  const seen = yield* Ref.make<ResumeGrid | null>(null);

  const stubs = Layer.mergeAll(
    Layer.succeed(RunQuery, {
      findRunTasks: () => Effect.succeed([CELL]),
    } as never),
    Layer.succeed(GridRun, {
      resume: (grid: ResumeGrid) => Ref.set(seen, grid),
    } as never),
    Layer.succeed(CredentialResolver, {
      resolve: () =>
        Effect.succeed(Redacted.make({ revision: 1, values: {} }) as never),
    } as never)
  );

  yield* Effect.gen(function* () {
    const runs = yield* ResumeRuns;

    yield* runs.resume({
      actor: { organizationId: "org" } as never,
      legacyHarnessAuth: "legacy",
      runId: "run_1",
    });
  }).pipe(Effect.provide(ResumeRunsLive.pipe(Layer.provide(stubs))));

  return yield* Ref.get(seen);
});

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
