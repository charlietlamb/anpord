import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@anpord/db/client";
import { Daytona } from "@daytonaio/sdk";
import {
  ConfigProvider,
  Effect,
  Layer,
  ManagedRuntime,
  Option,
  Stream,
} from "effect";
import { runCommandForOutcome } from "../../src/adapters/sandbox/run-command";
import { ScorerGroundTruthLive } from "../../src/adapters/scorers/ground-truth";
import { CredentialError } from "../../src/credentials/errors";
import { CredentialResolver } from "../../src/credentials/resolver";
import { HarnessUnavailable } from "../../src/domain/errors";
import type { SandboxName } from "../../src/domain/variant";
import { Batches } from "../../src/grid/batches";
import { EvalSandboxLive } from "../../src/layer";
import { Harnesses } from "../../src/ports/harness";
import { SimulatedUserSilent } from "../../src/ports/simulated-user";
import { AgentTrialLive } from "../../src/services/agent-trial";
import { EvalReads } from "../../src/services/eval-reads";
import { SuspenderSleeping } from "../../src/services/suspender";
import { hasDaytona, hasE2b } from "../fixtures/credentials";
import { skipWithoutDatabase } from "../fixtures/database";
import { seedOrganization } from "../fixtures/eval-rows";
import {
  actorOf,
  capturingRunner,
  caseOf,
  evalStack,
  requestOf,
  variantOf,
} from "../fixtures/eval-stack";

const TRIALS = Number(process.env.EVAL_CONCURRENCY_TRIALS ?? "50");
const LOCAL_TRIALS = 8;
const suffix = Date.now();

const oneCommandHarness = Layer.succeed(
  Harnesses,
  Harnesses.of({
    resolve: (harness) =>
      Effect.succeed({
        harness,
        prepare: () => Effect.succeed({}),
        run: (request) =>
          Effect.succeed({
            events: Stream.fromEffect(
              runCommandForOutcome(request.sandbox, "echo hello").pipe(
                Effect.map((outcome) => ({
                  _tag: "Command" as const,
                  at: Date.now(),
                  command: "echo hello",
                  exitCode: outcome.exitCode,
                  output: outcome.stdout,
                })),
                Effect.mapError(
                  (error) =>
                    new HarnessUnavailable({ harness, reason: error.reason })
                )
              )
            ),
            harness,
            usage: Effect.succeed(Option.none()),
            version: "0.0.0-test",
          }),
      }),
  })
);

const nothingConnected = Layer.succeed(
  CredentialResolver,
  CredentialResolver.of({
    persist: () => Effect.void,
    resolve: () =>
      Effect.fail(
        new CredentialError({ code: "not-found", message: "not connected" })
      ),
    resolveBound: () =>
      Effect.fail(
        new CredentialError({ code: "not-found", message: "not connected" })
      ),
  })
);

const configFor = (provider: SandboxName, trials: number) =>
  ConfigProvider.fromMap(
    new Map([
      [`EVAL_${provider.toUpperCase()}_CONCURRENCY`, `${trials}`],
      ["ANPORD_LOCAL_SANDBOX", "true"],
    ])
  ).pipe(ConfigProvider.orElse(() => ConfigProvider.fromEnv()));

const layerFor = (provider: SandboxName, trials: number) =>
  evalStack({
    agent: AgentTrialLive.pipe(
      Layer.provide(
        Layer.mergeAll(
          oneCommandHarness,
          ScorerGroundTruthLive,
          SimulatedUserSilent,
          SuspenderSleeping,
          nothingConnected
        )
      ),
      Layer.provide(EvalSandboxLive)
    ),
    resolver: nothingConnected,
    runner: capturingRunner([]),
  }).pipe(
    Layer.provideMerge(Layer.setConfigProvider(configFor(provider, trials)))
  );

const leftBehind = async (provider: SandboxName, ids: readonly string[]) => {
  if (provider !== "daytona") {
    return [];
  }

  const daytona = new Daytona();
  const found = await Promise.all(
    ids.map((sandboxId) =>
      daytona.get(sandboxId).then(
        () => sandboxId,
        () => null
      )
    )
  );

  return found.filter((id): id is string => id !== null);
};

const wave = (provider: SandboxName, trials: number, ready: boolean) =>
  describe.skipIf(!ready || skipWithoutDatabase())(
    `${trials} trials at once on ${provider}`,
    () => {
      const organizationId = `org_wave_${provider}_${suffix}`;
      const runtime = ManagedRuntime.make(layerFor(provider, trials));
      const perCase = Math.min(trials, 10);
      const cases = Array.from(
        { length: Math.ceil(trials / perCase) },
        (_, index) =>
          caseOf(`say-hello-${index}`, {
            variables: { task: "say hello" },
            verify: "echo verified",
          })
      );

      afterAll(async () => {
        await runtime.dispose();
      });

      beforeAll(async () => {
        await runtime.runPromise(
          Database.pipe(
            Effect.flatMap((db) =>
              Effect.promise(() => seedOrganization(db, organizationId))
            )
          )
        );
      });

      it(
        "completes every trial, voids none, and leaves no sandbox behind",
        async () => {
          const startedAt = Date.now();
          const batch = await runtime.runPromise(
            Effect.gen(function* () {
              const batches = yield* Batches;
              const started = yield* batches.start(
                actorOf(organizationId),
                requestOf({
                  cases,
                  trials: perCase,
                  variants: [
                    variantOf({
                      harness: "command",
                      model: "none",
                      sandbox: provider,
                    }),
                  ],
                })
              );
              yield* batches.execute(started.id);
              return yield* (yield* EvalReads).batch(
                organizationId,
                started.id
              );
            })
          );
          const elapsedMs = Date.now() - startedAt;
          const trialsRun = batch.runs.flatMap((entry) => entry.trials);
          const passed = trialsRun.filter((trial) => trial.status === "passed");
          const voided = trialsRun.filter((trial) => trial.status === "void");
          const stillThere = await leftBehind(
            provider,
            trialsRun.flatMap((trial) =>
              trial.sandboxId === null ? [] : [trial.sandboxId]
            )
          );

          console.log(
            `${trialsRun.length} trials on ${provider}: ${Math.round(elapsedMs / 1000)}s wall clock, ${passed.length} passed, ${voided.length} void, ${stillThere.length} sandboxes left behind`
          );

          expect(batch.status).toBe("finished");
          expect(trialsRun).toHaveLength(cases.length * perCase);
          expect(stillThere).toEqual([]);
          expect(voided).toHaveLength(0);
          expect(passed).toHaveLength(cases.length * perCase);
        },
        20 * 60 * 1000
      );
    }
  );

wave("local", LOCAL_TRIALS, true);
wave("daytona", TRIALS, hasDaytona);
wave("e2b", TRIALS, hasE2b);
