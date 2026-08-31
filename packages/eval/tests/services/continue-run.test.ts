import { describe, expect, test } from "bun:test";
import { Effect, Layer, Option, Redacted } from "effect";
import { CredentialResolver } from "../../src/credentials/connections";
import { GridRun, type ResumeGrid } from "../../src/grid/run";
import { RunQuery } from "../../src/repositories/run-query";
import {
  ContinueRuns,
  ContinueRunsLive,
} from "../../src/services/continue-run";

const cellFor = (
  caseName: string,
  model: string,
  harnessId: string | null
) => ({
  cell: {
    harness: "codex",
    harnessCredentialConnectionId: harnessId,
    harnessVersion: "1",
    model,
    provider: "daytona",
    runInternalId: "run-internal",
    sandboxCredentialConnectionId: null,
    taskInternalId: `internal-${caseName}`,
  },
  identity: `id-${caseName}`,
  name: caseName,
  prepareName: null,
  prepareSource: null,
  prompt: "{{task}}",
  source: { kind: "empty" },
  validatorName: null,
  validatorSource: null,
  verifyCommand: "true",
});

const asked: { connections: string[] } = { connections: [] };

const stubs = (
  cells: readonly unknown[],
  status: "running" | "failed" = "failed"
) =>
  Layer.mergeAll(
    Layer.succeed(RunQuery, {
      findRunTasks: () => Effect.succeed(cells),
    } as never),
    Layer.succeed(GridRun, {
      get: () => Effect.succeed(Option.some({ status })),
    } as never),
    Layer.succeed(CredentialResolver, {
      resolveBound: ({ connectionId }: { connectionId: string }) =>
        Effect.sync(() => {
          asked.connections.push(connectionId);

          return Redacted.make({ revision: 1, values: {} }) as never;
        }),
    } as never)
  );

const building = (cells: readonly unknown[], status?: "running" | "failed") =>
  Effect.gen(function* () {
    const runs = yield* ContinueRuns;

    return yield* runs.build({ organizationId: "org", runId: "run_1" });
  }).pipe(
    Effect.provide(ContinueRunsLive.pipe(Layer.provide(stubs(cells, status)))),
    Effect.either
  );

describe("continuing a run without a session", () => {
  test("rebuilds the cells the run stored, not their square", async () => {
    const outcome = await Effect.runPromise(
      building([
        cellFor("a", "gpt-5", "conn"),
        cellFor("b", "gpt-5", "conn"),
        cellFor("a", "claude", "conn"),
        cellFor("b", "claude", "conn"),
      ]) as never
    );

    const grid = (outcome as { right: ResumeGrid }).right;

    expect(grid.input.cases).toHaveLength(2);
    expect(grid.input.tasks).toHaveLength(2);
  });

  /* The point of the service: a worker has nobody to check against, so it
     resolves the connection the run already recorded. */
  test("asks for the credential the cell recorded", async () => {
    asked.connections = [];

    await Effect.runPromise(
      building([cellFor("a", "gpt-5", "conn-7")]) as never
    );

    expect(asked.connections).toContain("conn-7");
  });

  test("refuses a cell that recorded no credential, rather than guessing", async () => {
    const outcome = await Effect.runPromise(
      building([cellFor("a", "gpt-5", null)]) as never
    );

    expect((outcome as { _tag: string })._tag).toBe("Left");
  });

  test("refuses a run that is already running", async () => {
    const outcome = await Effect.runPromise(
      building([cellFor("a", "gpt-5", "conn")], "running") as never
    );

    expect((outcome as { _tag: string })._tag).toBe("Left");
  });

  test("refuses a run with no cells", async () => {
    const outcome = await Effect.runPromise(building([]) as never);

    expect((outcome as { _tag: string })._tag).toBe("Left");
  });
});
