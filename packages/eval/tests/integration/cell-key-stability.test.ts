import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { IdGeneratorLive } from "@anpord/ids/layer";
import {
  Duration,
  Effect,
  Layer,
  ManagedRuntime,
  Option,
  Redacted,
} from "effect";
import { SourceTokensNone } from "../../src/codebase/source-token";
import { layerTestResolver } from "../../src/credentials/connections";
import { GridRun } from "../../src/grid/run";
import { EvalGridLive, EvalSandboxLive } from "../../src/layer";
import { RunQuery } from "../../src/repositories/run-query";
import { HarnessVersionsLive } from "../../src/services/harness-versions";
import { fixedSource, VERIFY_COMMAND } from "../fixtures/broken-task";
import {
  codexCredential,
  hasCodex,
  hasDatabase,
} from "../fixtures/credentials";

const URL = process.env.EVAL_TEST_DATABASE_URL;
const READY = hasCodex && hasDatabase && Boolean(process.env.DAYTONA_API_KEY);

const TestLayer = EvalGridLive.pipe(
  Layer.provide(EvalSandboxLive),
  Layer.provide(SourceTokensNone),
  Layer.provide(layerTestResolver()),
  Layer.provide(HarnessVersionsLive),
  Layer.provide(IdGeneratorLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 12,
      statementTimeout: Duration.seconds(60),
      url: Redacted.make(URL ?? ""),
    })
  )
);

const runtime = ManagedRuntime.make(TestLayer);
const suffix = Date.now();
const organizationId = `org_key_${suffix}`;

const run = <A, E>(
  effect: Effect.Effect<A, E, Database | GridRun | RunQuery>
) => runtime.runPromise(effect as Effect.Effect<A, E, never>);

const startOne = () =>
  run(
    Effect.gen(function* () {
      const grid = yield* GridRun;

      return yield* grid.start({
        cases: [
          {
            variables: { task: "the tests already pass, change nothing" },
            name: "stable-case",
            setup: null,
            source: fixedSource,
            verify: VERIFY_COMMAND,
          },
        ],
        organizationId,
        prompt: "{{task}}",
        startedBy: null,
        tasks: [
          {
            credentials: { harness: codexCredential },
            harness: "codex",
            harnessVersion: "0.144.4",
            model: "gpt-5-codex",
            provider: "daytona",
          },
        ],
        trials: 1,
      });
    })
  );

const awaitFinish = (id: string) =>
  run(
    Effect.gen(function* () {
      const query = yield* RunQuery;

      return yield* Effect.iterate(
        { attempts: 0, done: false },
        {
          body: (state) =>
            Effect.sleep(Duration.seconds(5)).pipe(
              Effect.zipRight(query.findRun(organizationId, id)),
              Effect.map((found) => ({
                attempts: state.attempts + 1,
                done: Option.isSome(found)
                  ? found.value.run.status !== "running"
                  : false,
              }))
            ),
          while: (state) => !state.done && state.attempts < 40,
        }
      );
    })
  );

const cellKeyOfRun = (id: string) =>
  run(
    Effect.gen(function* () {
      const query = yield* RunQuery;
      const found = yield* query.findRun(organizationId, id);

      return Option.isNone(found)
        ? null
        : (found.value.cells[0]?.cell.cellKey ?? null);
    })
  );

describe.skipIf(!READY)("cell keys across runs", () => {
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
              name: "key stability",
              slug: `key-${suffix}`,
            })
            .onConflictDoNothing()
        );
      })
    );
  });

  /** The property the whole baseline feature rests on. Two runs of the same
   * case, same harness, same model, same provider must land on one cell key,
   * or a promoted baseline can never match a later run and no regression is
   * detectable across time. */
  it(
    "gives the same case the same cell key on a second run",
    async () => {
      const first = await startOne();
      await awaitFinish(first);

      const second = await startOne();
      await awaitFinish(second);

      const firstKey = await cellKeyOfRun(first);
      const secondKey = await cellKeyOfRun(second);

      expect(firstKey).not.toBeNull();
      expect(secondKey).not.toBeNull();
      expect(secondKey).toBe(firstKey as string);
    },
    { timeout: 600_000 }
  );
});
