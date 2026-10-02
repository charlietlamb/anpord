import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { FetchHttpClient } from "@effect/platform";
import { Database } from "@sphynx/db/client";
import { skipWithoutDatabase } from "@sphynx/db/test-database";
import { EvalJudge } from "@sphynx/schema/domain/eval-judges";
import { validationExecution } from "@sphynx/schema/domain/eval-validations";
import type {
  HarnessEvent,
  HarnessUsage,
} from "@sphynx/schema/domain/harness-event";
import type { TrialOutcome } from "@sphynx/schema/domain/trial";
import { Effect, Layer, ManagedRuntime, Option, Schema, Stream } from "effect";
import { SimulatedUserLive } from "../../src/adapters/user/layer";
import { Batches } from "../../src/batch/batches";
import { JudgeModel } from "../../src/judges/model";
import { Harnesses } from "../../src/ports/harness";
import { ModelPrices } from "../../src/ports/model-source";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { SandboxProvider } from "../../src/ports/sandbox";
import { Scorer } from "../../src/ports/scorer";
import { AgentTrialLive } from "../../src/services/agent-trial";
import { EvalReads } from "../../src/services/eval-reads";
import { HarnessVersions } from "../../src/services/harness-versions";
import { AgentTrialJudgedLive } from "../../src/services/judged-trial";
import { SuspenderSleeping } from "../../src/services/suspender";
import { declinesEverything } from "../fixtures/declines-everything";
import { seedOrganization } from "../fixtures/eval-rows";
import {
  actorOf,
  capturingRunner,
  caseOf,
  evalStack,
  requestOf,
  seedConnections,
  variantOf,
} from "../fixtures/eval-stack";

const organizationId = `org_spend_${Date.now()}`;

const usageOf = (input: number, output: number): HarnessUsage => ({
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: input,
  outputTokens: output,
  totalTokens: input + output,
});

const PRICES: Record<string, { input: number; output: number }> = {
  "claude-person": { input: 3, output: 15 },
  "agent-model": { input: 1, output: 8 },
  "judge-model": { input: 1, output: 4 },
};

const spoken = (session: string, text: string): HarnessEvent[] => [
  { _tag: "Started", at: 0, model: "m", sessionId: session },
  { _tag: "Message", at: 1, role: "assistant", text },
];

const conversing = () => {
  const said = { codex: 0, claude: 0 };
  const lines = {
    codex: ["What colour should it be?", "Done, it is blue."],
    claude: ["It should be blue.", "<<DONE>>"],
  };
  const spent = {
    codex: [usageOf(10, 1), usageOf(20, 2)],
    claude: [usageOf(100, 10), usageOf(40, 5)],
  };

  return Layer.succeed(
    Harnesses,
    Harnesses.of({
      resolve: (harness) =>
        Effect.succeed({
          harness,
          prepare: () => Effect.succeed({}),
          resume: "usage-per-run",
          run: () =>
            Effect.sync(() => {
              const speaker = harness === "claude" ? "claude" : "codex";
              const turn = said[speaker];
              said[speaker] += 1;
              return {
                events: Stream.fromIterable(
                  spoken(`${speaker}-s`, lines[speaker][turn] ?? "")
                ),
                harness,
                usage: Effect.succeed(
                  Option.fromNullable<HarnessUsage>(spent[speaker][turn])
                ),
                version: "9.9.9",
              };
            }),
        }),
    })
  );
};

const obliging: SandboxHandle = {
  ...declinesEverything,
  exec: () =>
    Stream.fromIterable<ExecChunk>([
      { at: 0, data: "", stream: "stdout" },
      { at: 0, exitCode: 0, stream: "exit" },
    ]),
  home: "/home/sandbox",
  id: "sbx-spend",
  provider: "daytona",
  writeFile: () => Effect.void,
};

const passed: TrialOutcome = {
  artifacts: [],
  commandCount: 0,
  exitCode: 0,
  modelMs: 1,
  sandboxMs: 1,
  status: "passed",
  validations: [],
  verifySteps: [],
  voidFields: [],
};

const shared = Layer.mergeAll(
  conversing(),
  FetchHttpClient.layer,
  SuspenderSleeping,
  Layer.succeed(HarnessVersions, { version: () => Effect.succeed("9.9.9") }),
  Layer.succeed(
    SandboxProvider,
    SandboxProvider.of({
      attach: () => Effect.die("not attached here"),
      destroy: () => Effect.void,
      open: () => Effect.succeed(obliging),
    })
  )
);

const agent = AgentTrialJudgedLive.pipe(
  Layer.provide(
    AgentTrialLive.pipe(
      Layer.provide(SimulatedUserLive),
      Layer.provide(
        Layer.succeed(
          Scorer,
          Scorer.of({ score: () => Effect.succeed(passed) })
        )
      )
    )
  ),
  Layer.provide(
    Layer.succeed(JudgeModel, {
      complete: () =>
        Effect.succeed({
          text: '{"choice":"yes","reason":"It is blue."}',
          usage: usageOf(1000, 200),
        }),
    })
  ),
  Layer.provide(shared)
);

const runtime = ManagedRuntime.make(
  evalStack({
    agent,
    prices: Layer.succeed(ModelPrices, {
      forModel: (model) =>
        Effect.succeed(
          Option.fromNullable(PRICES[model]).pipe(
            Option.map((rate) => ({
              ...rate,
              cacheRead: null,
              cacheWrite: null,
            }))
          )
        ),
    }),
    runner: capturingRunner([]),
  })
);

describe.skipIf(skipWithoutDatabase())("what a trial spent", () => {
  beforeAll(async () => {
    await runtime.runPromise(
      Database.pipe(
        Effect.flatMap((db) =>
          Effect.promise(async () => {
            await seedOrganization(db, organizationId);
            await seedConnections(db, organizationId);
          })
        )
      )
    );
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  it("prices the simulated user and the judge beside the agent, and counts every agent turn", async () => {
    const batch = await runtime.runPromise(
      Effect.gen(function* () {
        const batches = yield* Batches;
        const started = yield* batches.start(
          actorOf(organizationId),
          requestOf({
            cases: [
              caseOf("paint", {
                user: {
                  goal: "a blue button",
                  harness: "claude",
                  kind: "simulated",
                  model: "claude-person",
                  prompt: "The button should be blue.",
                },
                validator: {
                  checks: [],
                  judges: [
                    Schema.decodeUnknownSync(EvalJudge)({
                      choices: { no: 0, yes: 1 },
                      kind: "judge",
                      model: "judge-model",
                      name: "blue",
                      prompt: "Is the button blue?",
                      provider: "openai",
                    }),
                  ],
                  kind: "judged",
                  name: "judged",
                },
                variables: { task: "Paint the button." },
              }),
            ],
            variants: [variantOf({ harness: "codex", model: "gpt-5" })],
          })
        );
        yield* batches.execute(started.id);
        return yield* (yield* EvalReads).batch(organizationId, started.id);
      })
    );
    const trial = batch.runs[0]?.trials[0];
    const components = trial?.costs?.components ?? [];
    const priced = (name: string) =>
      components
        .filter((part) => part.component === name)
        .map(({ classification, usd }) => ({ classification, usd }));

    expect(priced("user")).toEqual([
      { classification: "estimate", usd: 0.000_645 },
    ]);
    expect(priced("judge")).toEqual([
      { classification: "estimate", usd: 0.0018 },
    ]);
    expect([trial?.usage?.inputTokens, trial?.usage?.outputTokens]).toEqual([
      30, 3,
    ]);
  });

  it("prices a trial a local run reports the same way", async () => {
    const run = await runtime.runPromise(
      Effect.gen(function* () {
        const batches = yield* Batches;
        const started = yield* batches.start(
          actorOf(organizationId),
          requestOf({
            cases: [caseOf("reported-paint")],
            local: true,
            variants: [
              variantOf({
                harness: "codex",
                model: "agent-model",
                sandbox: "local",
              }),
            ],
          })
        );
        const runId = started.runs[0]?.id ?? "";
        yield* batches.report(organizationId, {
          events: [],
          ordinal: 1,
          outcome: {
            ...passed,
            validations: [
              {
                ...validationExecution(
                  { id: "judge:0", index: 0, kind: "judge", name: "blue" },
                  0
                ),
                judgment: {
                  choice: "yes",
                  durationMs: 1,
                  error: null,
                  evaluator: "openai",
                  model: "judge-model",
                  name: "blue",
                  reason: "It is blue.",
                  score: 1,
                  threshold: 1,
                  usage: usageOf(1000, 200),
                },
              },
            ],
          },
          runId,
          sandboxId: "laptop",
          usage: usageOf(2000, 100),
          userSpend: { model: "claude-person", usage: usageOf(140, 15) },
        });
        return yield* (yield* EvalReads).run(organizationId, runId);
      })
    );
    const components = run.trials[0]?.costs?.components ?? [];

    expect(
      components
        .filter(({ component }) =>
          ["model", "user", "judge", "sandbox"].includes(component)
        )
        .map(({ classification, component, usd }) => [
          component,
          classification,
          usd,
        ])
    ).toEqual([
      ["judge", "estimate", 0.0018],
      ["model", "estimate", 0.0028],
      ["sandbox", "included", null],
      ["user", "estimate", 0.000_645],
    ]);
  });
});
