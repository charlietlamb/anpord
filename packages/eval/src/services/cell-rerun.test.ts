import { expect, test } from "bun:test";
import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import { Effect, Layer, Option, Stream } from "effect";
import { layerTestResolver } from "../credentials/connections";
import type { WorkspaceSource } from "../domain/workspace-source";
import { GridRun, type StartGrid } from "../grid/run";
import { type CellTask, RunQuery } from "../repositories/run-query";
import { make } from "./cell-rerun";

const cellTask = (source: WorkspaceSource | null): CellTask => ({
  cell: {
    harness: "codex",
    harnessVersion: "0.144.4",
    model: "gpt-5.2",
    provider: "daytona",
  } as CellTask["cell"],
  identity: "task_identity",
  name: "Browser task",
  prompt: "Fix the browser task",
  repoRef: null,
  repoUrl: null,
  prepareName: null,
  prepareSource: null,
  source,
  verifyCommand: "bun test",
});

const layer = (
  source: WorkspaceSource | null,
  onStart: (input: StartGrid) => void
) =>
  Layer.mergeAll(
    Layer.succeed(
      GridRun,
      GridRun.of({
        changes: Stream.empty,
        execute: () => Effect.void,
        get: () => Effect.succeed(Option.none()),
        list: () => Effect.succeed({ next: null, runs: [], total: 0 }),
        resume: () => Effect.void,
        start: (input) =>
          Effect.sync(() => {
            onStart(input);
            return "run_new";
          }),
      })
    ),
    Layer.succeed(
      RunQuery,
      RunQuery.of({
        countRuns: () => Effect.succeed(0),
        findCellHistory: () => Effect.succeed([]),
        findCellTask: () => Effect.succeed(Option.some(cellTask(source))),
        findRunTasks: () => Effect.succeed([]),
        findRun: () => Effect.succeed(Option.none()),
        hydrateRuns: () => Effect.succeed([]),
        listRuns: () => Effect.succeed([]),
      })
    )
  );

const ignoreStart = (_: StartGrid) => undefined;
const actor = Actor.make({
  id: UserId.make("user_id"),
  isUser: true,
  organizationId: OrganizationId.make("org_id"),
  permissions: [],
});

const rerun = (
  source: WorkspaceSource | null,
  onStart: (input: StartGrid) => void = ignoreStart
) =>
  Effect.gen(function* () {
    const service = yield* make;
    return yield* service.again({
      actor,
      cellKey: "cell_key",
      legacyHarnessAuth: "credentials",
      organizationId: "org_id",
      runId: "run_id",
      startedBy: "user_id",
      trials: 2,
    });
  }).pipe(
    Effect.provide(layer(source, onStart)),
    Effect.provide(layerTestResolver())
  );

test("cell reruns preserve file workspaces", async () => {
  const source = {
    files: { "src/index.ts": "export {}" },
    kind: "files",
  } as const;
  let started: StartGrid | undefined;

  const id = await Effect.runPromise(
    rerun(source, (input) => {
      started = input;
    })
  );

  expect(id).toBe("run_new");
  expect(started?.cases[0]?.identity).toBe("task_identity");
  expect(started?.prompt).toBe("Fix the browser task");
  expect(started?.cases[0]?.source).toEqual(source);
  expect(started?.trials).toBe(2);
});

test("cell reruns refuse legacy rows without a workspace snapshot", async () => {
  const failure = await Effect.runPromise(rerun(null).pipe(Effect.flip));

  if (failure._tag !== "NotRunnable") {
    throw failure;
  }

  expect(failure.problems).toEqual([
    "this cell predates reproducible workspace snapshots",
  ]);
});
