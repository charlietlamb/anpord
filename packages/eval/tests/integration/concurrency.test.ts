import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Daytona } from "@daytonaio/sdk";
import { FetchHttpClient } from "@effect/platform";
import {
  ConfigProvider,
  Duration,
  Effect,
  Layer,
  ManagedRuntime,
  Option,
  Redacted,
  Stream,
} from "effect";
import { ModelPricesLive } from "../../src/adapters/models/prices";
import { runCommandForOutcome } from "../../src/adapters/sandbox/run-command";
import { ScorerGroundTruthLive } from "../../src/adapters/scorers/ground-truth";
import { SourceTokensNone } from "../../src/codebase/source-token";
import { layerTestResolver } from "../../src/credentials/layer-test-resolver";
import type { ProviderName } from "../../src/domain/cell";
import { HarnessUnavailable } from "../../src/domain/errors";
import { GridRun, GridRunLive } from "../../src/grid/run";
import { EvalRepositoriesLive, EvalSandboxLive } from "../../src/layer";
import { Harnesses } from "../../src/ports/harness";
import { TrialRunnerInProcess } from "../../src/ports/trial-runner";
import { RunQuery } from "../../src/repositories/run-query";
import { AgentTrialLive } from "../../src/services/agent-trial";
import { BaselinesLive } from "../../src/services/baselines";
import { HarnessVersionsLive } from "../../src/services/harness-versions";
import { SuspenderSleeping } from "../../src/services/resumable-command";
import { hasDatabase, hasDaytona } from "../fixtures/credentials";

/**
 * Many sandboxes in one wave, on a real provider.
 *
 * The only throttle in the system is the per-provider semaphore, and five was
 * the tested ceiling. This opens a wave at once with no model in the loop: a
 * harness that runs one shell command and reports it, so what is measured is
 * the provider, the pool, and the journal path, not an agent.
 *
 * The wave is `EVAL_CONCURRENCY_TRIALS`, default fifty, because the number a
 * provider admits is a fact about the account rather than the code. Measured
 * on 3 September 2026 from a laptop:
 *
 *   daytona, 50: 2 passed, 48 void in 8s. The organisation's tier caps the
 *   whole account at 10 CPUs, 10 GiB and 30 GiB of disk, and every sandbox
 *   past that is refused at open. Each refusal voided its own trial and the
 *   rest ran, which is the isolation this wave exists to prove.
 *   daytona, 4: see the numbers printed by the run.
 *   e2b, 20: see the numbers printed by the run.
 *
 * Run with `bun --env-file=../../.env test tests/integration/concurrency.test.ts`
 * from `packages/eval`; `bun run test` strips the provider keys.
 */

const TRIALS = Number(process.env.EVAL_CONCURRENCY_TRIALS ?? "50");
const URL = process.env.EVAL_TEST_DATABASE_URL;
const hasE2B = Boolean(process.env.E2B_API_KEY);

/* A harness whose whole session is one command in the sandbox. Enough to
   prove the sandbox ran something and the journal recorded it. */
const oneCommandHarness = Layer.succeed(
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
                    new HarnessUnavailable({
                      harness,
                      reason: error.reason,
                    })
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

const grid = GridRunLive.pipe(
  Layer.provide(TrialRunnerInProcess),
  Layer.provide(ModelPricesLive.pipe(Layer.provide(FetchHttpClient.layer))),
  Layer.provide(BaselinesLive),
  Layer.provideMerge(BaselinesLive)
);

const concurrencyOf = (provider: ProviderName) =>
  Layer.setConfigProvider(
    ConfigProvider.fromMap(
      new Map([[`EVAL_${provider.toUpperCase()}_CONCURRENCY`, `${TRIALS}`]])
    ).pipe(ConfigProvider.orElse(() => ConfigProvider.fromEnv()))
  );

const layerFor = (provider: ProviderName) =>
  grid.pipe(
    Layer.provide(
      AgentTrialLive.pipe(
        Layer.provide(
          Layer.mergeAll(
            oneCommandHarness,
            ScorerGroundTruthLive,
            SuspenderSleeping
          )
        )
      )
    ),
    Layer.provideMerge(EvalRepositoriesLive),
    Layer.provide(EvalSandboxLive),
    Layer.provide(SourceTokensNone),
    Layer.provide(layerTestResolver()),
    Layer.provide(HarnessVersionsLive),
    Layer.provide(IdGeneratorLive),
    Layer.provideMerge(DatabaseLive),
    Layer.provide(
      Layer.succeed(DatabaseConfig, {
        poolMax: 24,
        statementTimeout: Duration.seconds(60),
        url: Redacted.make(URL ?? ""),
      })
    ),
    Layer.provide(concurrencyOf(provider))
  );

const suffix = Date.now();

type Tags = Database | GridRun | RunQuery;

const harnessCredential = Redacted.make({
  authMethodId: "test",
  connectionId: "test",
  integrationId: "codex",
  revision: 1,
  values: {},
});

interface Settled {
  readonly cells: readonly {
    readonly cell: { readonly status: string };
    readonly trials: readonly {
      readonly failure: string | null;
      readonly sandboxId: string | null;
      readonly status: string;
    }[];
  }[];
  readonly run: { readonly status: string };
}

const settledRun = (organizationId: string, id: string) =>
  Effect.gen(function* () {
    const query = yield* RunQuery;

    return yield* Effect.iterate(
      { attempts: 0, detail: Option.none<Settled>() },
      {
        body: (state) =>
          query.findRun(organizationId, id).pipe(
            Effect.flatMap((found) =>
              Option.isSome(found) && found.value.run.status !== "running"
                ? Effect.succeed({
                    attempts: state.attempts,
                    detail: Option.some(found.value as unknown as Settled),
                  })
                : Effect.sleep("2 seconds").pipe(
                    Effect.as({
                      attempts: state.attempts + 1,
                      detail: Option.none<Settled>(),
                    })
                  )
            )
          ),
        while: (state) => Option.isNone(state.detail) && state.attempts < 300,
      }
    );
  });

/* The provider is the witness for leaks: every id the run recorded must be
   gone. Daytona's `get` on a deleted sandbox rejects. Other providers have no
   cheap equivalent and are judged on the run alone. */
const leftBehind = async (provider: ProviderName, ids: readonly string[]) => {
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

const wave = (provider: ProviderName, ready: boolean) =>
  describe.skipIf(!(ready && hasDatabase))(
    `${TRIALS} trials at once on ${provider}`,
    () => {
      const organizationId = `org_conc_${provider}_${suffix}`;
      const runtime = ManagedRuntime.make(layerFor(provider));
      const run = <A, E>(effect: Effect.Effect<A, E, Tags>) =>
        runtime.runPromise(effect as Effect.Effect<A, E, never>);

      afterAll(async () => {
        await runtime.dispose();
      });

      beforeAll(async () => {
        await run(
          Effect.gen(function* () {
            const db = yield* Database;

            yield* Effect.promise(() =>
              db
                .insert(organization)
                .values({
                  createdAt: new Date(),
                  id: organizationId,
                  name: "concurrency",
                  slug: `conc-${provider}-${suffix}`,
                })
                .onConflictDoNothing()
            );
          })
        );
      });

      it(
        "completes every trial, voids none, and leaves no sandbox behind",
        async () => {
          const startedAt = Date.now();

          const id = await run(
            Effect.gen(function* () {
              const grid = yield* GridRun;

              return yield* grid.start({
                cases: [
                  {
                    name: "say-hello",
                    prepare: null,
                    source: { kind: "empty" },
                    variables: {},
                    verify: "echo verified",
                  },
                ],
                name: `concurrency-${TRIALS}`,
                organizationId,
                prompt: "say hello",
                startedBy: null,
                tasks: [
                  {
                    credentials: { harness: harnessCredential },
                    harness: "codex",
                    harnessVersion: "0.0.0-test",
                    model: "none",
                    provider,
                  },
                ],
                trials: TRIALS,
              });
            })
          );

          const settled = await run(settledRun(organizationId, id));
          const elapsedMs = Date.now() - startedAt;

          expect(Option.isSome(settled.detail)).toBe(true);

          if (Option.isNone(settled.detail)) {
            return;
          }

          const detail = settled.detail.value;
          const trials = detail.cells.flatMap((cell) => cell.trials);
          const statuses = trials.map((trial) => trial.status);
          const passed = statuses.filter((status) => status === "passed");
          const voided = trials.filter((trial) => trial.status === "void");
          const ids = trials.flatMap((trial) =>
            trial.sandboxId === null ? [] : [trial.sandboxId]
          );
          const stillThere = await leftBehind(provider, ids);

          console.log(
            [
              `${TRIALS} trials on ${provider}: ${Math.round(elapsedMs / 1000)}s wall clock,`,
              `${passed.length} passed, ${voided.length} void,`,
              `${stillThere.length} sandboxes left behind`,
              voided[0]?.failure === null || voided[0] === undefined
                ? ""
                : `\n  first void: ${voided[0].failure?.slice(0, 160)}`,
            ].join(" ")
          );

          expect(detail.run.status).toBe("finished");
          expect(trials).toHaveLength(TRIALS);
          expect(stillThere).toEqual([]);
          expect(voided).toHaveLength(0);
          expect(passed).toHaveLength(TRIALS);
        },
        20 * 60 * 1000
      );
    }
  );

wave("daytona", hasDaytona);
wave("e2b", hasE2B);
