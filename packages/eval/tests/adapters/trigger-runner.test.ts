import { describe, expect, mock, test } from "bun:test";
import { batchTagOf } from "@anpord/schema/domain/evals";
import { ConfigProvider, Effect } from "effect";

const sent: { calls: unknown[] } = { calls: [] };

mock.module("@trigger.dev/sdk", () => ({
  configure: () => undefined,
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

const withKey = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.withConfigProvider(
      ConfigProvider.fromMap(new Map([["TRIGGER_SECRET_KEY", "tr_test_key"]]))
    )
  );

const dispatching = Effect.gen(function* () {
  const runner = yield* TrialRunner;

  yield* runner.dispatch({
    batchId: "ebat_1",
    organizationId: "org_1",
    work: Effect.die("this must never run here"),
  });
}).pipe(Effect.provide(TrialRunnerTrigger));

describe("handing a batch to a worker", () => {
  test("names the task the worker registers", async () => {
    sent.calls = [];
    await Effect.runPromise(withKey(dispatching));

    expect((sent.calls[0] as { id: string }).id).toBe("eval-run");
  });

  test("sends identifiers and nothing else", async () => {
    sent.calls = [];
    await Effect.runPromise(withKey(dispatching));

    expect((sent.calls[0] as { payload: unknown }).payload).toEqual({
      batchId: "ebat_1",
      organizationId: "org_1",
    });
  });

  test("tags the task with its organization and batch", async () => {
    sent.calls = [];
    await Effect.runPromise(withKey(dispatching));

    expect((sent.calls[0] as { options: unknown }).options).toEqual({
      tags: ["org_org_1", batchTagOf("ebat_1")],
    });
  });

  test("does not run the work it was handed", async () => {
    sent.calls = [];

    const outcome = await Effect.runPromise(
      withKey(Effect.either(dispatching))
    );

    expect((outcome as { _tag: string })._tag).toBe("Right");
  });
});

describe("where the key comes from", () => {
  test("accepts the name this project's environments use", async () => {
    const outcome = await Effect.runPromise(
      Effect.either(dispatching).pipe(
        Effect.withConfigProvider(
          ConfigProvider.fromMap(new Map([["TRIGGER_API_KEY", "tr_prod_key"]]))
        )
      )
    );

    expect(outcome._tag).toBe("Right");
  });

  test("refuses to build without one", async () => {
    const outcome = await Effect.runPromise(
      Effect.either(dispatching).pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    );

    expect(outcome._tag).toBe("Left");
  });
});
