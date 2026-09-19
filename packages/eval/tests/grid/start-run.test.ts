import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { connectionNotFound } from "../../src/credentials/errors";
import { CredentialResolver } from "../../src/credentials/resolver";
import { makeStartRun } from "../../src/grid/start-run";
import { TrialRunner } from "../../src/ports/trial-runner";
import { HarnessProfileRepository } from "../../src/repositories/harness-profile-repository";
import { RunRepository } from "../../src/repositories/run-repository";
import { TaskRepository } from "../../src/repositories/task-repository";

const unconnected = Layer.succeed(CredentialResolver, {
  persist: () => Effect.void,
  resolve: () => Effect.fail(connectionNotFound()),
  resolveBound: () => Effect.fail(connectionNotFound()),
} as never);

const start = (input: {
  readonly dispatch?: Effect.Effect<void, Error>;
  readonly user?: unknown;
}) => {
  const inserted: unknown[] = [];
  const finished: Record<string, unknown>[] = [];

  const runs = Layer.succeed(RunRepository, {
    finish: (row: Record<string, unknown>) =>
      Effect.sync(() => {
        finished.push(row);
      }),
    insert: () =>
      Effect.sync(() => {
        inserted.push(1);

        return { id: "run_1", internalId: "rin_1" };
      }),
    insertCells: () => Effect.void,
  } as never);

  const runner = Layer.succeed(TrialRunner, {
    dispatch: () => input.dispatch ?? Effect.void,
  } as never);

  const tasks = Layer.succeed(TaskRepository, {
    upsertByIdentity: () =>
      Effect.succeed({ id: "tsk_1", internalId: "tin_1" }),
  } as never);

  const profiles = Layer.succeed(HarnessProfileRepository, {
    upsertByFingerprint: () => Effect.succeed({ internalId: "pin_1" }),
  } as never);

  const live = { update: () => Effect.void } as never;

  return makeStartRun(() => Effect.void, live).pipe(
    Effect.flatMap((run) =>
      run({
        cases: [{ source: { kind: "empty" }, user: input.user, variables: {} }],
        name: "s",
        organizationId: "org_1",
        prompt: "p",
        startedBy: "usr_1",
        tasks: [{ harness: "codex", model: "m", provider: "e2b" }],
        trials: 1,
      } as never)
    ),
    Effect.provide(Layer.mergeAll(runs, runner, unconnected, tasks, profiles)),
    Effect.exit,
    Effect.map((exit) => ({ exit, finished, inserted }))
  );
};

describe("starting a run", () => {
  /* Everything between the insert and the handover can fail, and the row is
     already visible by then, so it is settled rather than left running. */
  it("settles the row when the handover fails", async () => {
    const { finished } = await Effect.runPromise(
      start({ dispatch: Effect.fail(new Error("no runner")) })
    );

    expect(finished).toHaveLength(1);
    expect(finished[0]?.status).toBe("failed");
  });
});
