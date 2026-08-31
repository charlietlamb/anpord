import { describe, expect, mock, test } from "bun:test";
import { Effect } from "effect";

const sent: { calls: unknown[] } = { calls: [] };

mock.module("@trigger.dev/sdk", () => ({
  tasks: {
    trigger: (id: string, payload: unknown, options: unknown) => {
      sent.calls.push({ id, options, payload });

      return Promise.resolve({ id: "run_handle" });
    },
  },
}));

const { TrialRunnerTrigger } = await import(
  "../../src/adapters/runner/trigger"
);
const { TrialRunner } = await import("../../src/ports/trial-runner");

const dispatching = Effect.gen(function* () {
  const runner = yield* TrialRunner;

  yield* runner.dispatch({
    organizationId: "org_1",
    runId: "run_1",
    work: Effect.die("this must never run here"),
  });
}).pipe(Effect.provide(TrialRunnerTrigger));

describe("handing a run to a worker", () => {
  test("names the task the worker registers", async () => {
    sent.calls = [];
    await Effect.runPromise(dispatching);

    expect((sent.calls[0] as { id: string }).id).toBe("eval-run");
  });

  /* The whole reason the payload is ids: Trigger records payloads and shows
     them in a dashboard, so a credential in one is a credential on a screen. */
  test("sends identifiers and nothing else", async () => {
    sent.calls = [];
    await Effect.runPromise(dispatching);

    expect((sent.calls[0] as { payload: unknown }).payload).toEqual({
      organizationId: "org_1",
      runId: "run_1",
    });
  });

  test("does not run the work it was handed", async () => {
    sent.calls = [];

    const outcome = await Effect.runPromise(Effect.either(dispatching));

    expect((outcome as { _tag: string })._tag).toBe("Right");
  });
});
