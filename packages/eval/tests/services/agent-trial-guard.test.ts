import { describe, expect, it } from "bun:test";
import { Effect, Layer, Option, Redacted, Stream } from "effect";
import { EvalStoreError } from "../../src/domain/errors";
import type { TrialOutcome } from "../../src/domain/trial";
import { Harnesses } from "../../src/ports/harness";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { SandboxProvider } from "../../src/ports/sandbox";
import { Scorer } from "../../src/ports/scorer";
import {
  AgentTrial,
  AgentTrialLive,
  type AgentTrialRequest,
} from "../../src/services/agent-trial";
import { SuspenderSleeping } from "../../src/services/suspender";
import { declinesEverything } from "../fixtures/declines-everything";

const passed: TrialOutcome = {
  commandCount: 1,
  exitCode: 0,
  modelMs: 1,
  passed: true,
  sandboxMs: 1,
  status: "passed",
  verifySteps: [],
  voidFields: [],
};

const obliging = (id: string): SandboxHandle => ({
  ...declinesEverything,
  exec: () =>
    Stream.fromIterable<ExecChunk>([
      { at: 0, data: "", stream: "stdout" },
      { at: 0, exitCode: 0, stream: "exit" },
    ]),
  home: "/home/agent",
  id,
  provider: "daytona",
  writeFile: () => Effect.void,
});

const recordingSandboxes = (order: string[]) =>
  Layer.succeed(
    SandboxProvider,
    SandboxProvider.of({
      attach: () => Effect.die("not attached here"),
      destroy: (input) =>
        Effect.sync(() => {
          order.push(`destroy ${input.id}`);
        }),
      open: () =>
        Effect.sync(() => {
          order.push("open sbx-new");
          return obliging("sbx-new");
        }),
    })
  );

const quietHarness = Layer.succeed(
  Harnesses,
  Harnesses.of({
    resolve: (harness) =>
      Effect.succeed({
        capabilities: {
          commands: true,
          fileChanges: false,
          streaming: true,
          usage: false,
        },
        harness,
        prepare: () => Effect.succeed({}),
        run: () =>
          Effect.succeed({
            events: Stream.make({
              _tag: "Command" as const,
              at: 1,
              command: "true",
              exitCode: 0,
              output: "",
            }),
            harness,
            usage: Effect.succeed(Option.none()),
            version: "0.0.0",
          }),
      }),
  })
);

const scorerSaying = (outcome: TrialOutcome) =>
  Layer.succeed(Scorer, Scorer.of({ score: () => Effect.succeed(outcome) }));

const request: AgentTrialRequest = {
  autoStopMinutes: 5,
  harness: "codex",
  harnessCredential: Redacted.make({
    authMethodId: "test",
    connectionId: "test",
    integrationId: "codex",
    revision: 1,
    values: {},
  }),
  harnessVersion: "0.0.0",
  model: "gpt-5",
  organizationId: "org_guard",
  prepare: null,
  profile: null,
  prompt: "do nothing",
  provider: "daytona",
  source: { kind: "empty" },
  verifyCommand: "true",
  workspace: "/tmp/anpord-task",
};

const runWith = (order: string[], extra: Partial<AgentTrialRequest>) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const agent = yield* AgentTrial;
      return yield* agent.run({ ...request, ...extra });
    }).pipe(
      Effect.provide(
        AgentTrialLive.pipe(
          Layer.provide(
            Layer.mergeAll(
              quietHarness,
              scorerSaying(passed),
              SuspenderSleeping,
              recordingSandboxes(order)
            )
          )
        )
      )
    )
  );

describe("AgentTrial guards", () => {
  /* A resumed attempt is told which sandbox the dead one held. It goes before
     the new one opens, so a trial never holds two at once. */
  it("destroys the prior sandbox before opening a new one", async () => {
    const order: string[] = [];

    const result = await runWith(order, { priorSandboxId: "sbx-old" });

    expect(order).toEqual(["destroy sbx-old", "open sbx-new"]);
    expect(result.sandboxId).toBe("sbx-new");
    expect(result.outcome.status).toBe("passed");
  });

  it("opens straight away when there is nothing to destroy", async () => {
    const order: string[] = [];

    await runWith(order, {});

    expect(order).toEqual(["open sbx-new"]);
  });

  /* The journal is the instrument. A trial whose record is missing events
     settles void with the field named, rather than passing on a journal
     shorter than what happened. */
  it("settles void when the journal could not be recorded", async () => {
    const order: string[] = [];

    const result = await runWith(order, {
      progress: {
        append: () =>
          Effect.fail(
            new EvalStoreError({ cause: "pool exhausted", operation: "t" })
          ),
      },
    });

    expect(result.outcome.status).toBe("void");
    expect(result.outcome.passed).toBe(false);
    expect(result.outcome.voidFields).toContain("journal");
    expect(result.events).toHaveLength(1);
  });
});
