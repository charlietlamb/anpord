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
import { CellKey } from "../../src/domain/cell";
import { GridRun } from "../../src/grid/run";
import { EvalGridLive, EvalSandboxLive } from "../../src/layer";
import { RunQuery } from "../../src/repositories/run-query";
import { Baselines } from "../../src/services/baselines";
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

const suffix = Date.now();
const organizationId = `org_grid_${suffix}`;

type Tags = Baselines | Database | GridRun | RunQuery;

/* One runtime for the whole file rather than a layer per call. A grid forks a
   daemon that outlives the request that started it, so tearing the layer down
   between calls closes the connection pool underneath work that is still
   running. The server keeps this layer for the life of the process, and the
   test has to model that or it measures its own teardown. */
const runtime = ManagedRuntime.make(TestLayer);

const run = <A, E>(effect: Effect.Effect<A, E, Tags>) =>
  runtime.runPromise(effect as Effect.Effect<A, E, never>);

describe.skipIf(!READY)("a grid persists and compares", () => {
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
              name: "grid",
              slug: `grid-${suffix}`,
            })
            .onConflictDoNothing()
        );
      })
    );
  });

  /** The whole product in one test: run a grid with no agent, read it back
   * from the record, promote a cell, and confirm the second reading is
   * measured against the first. */
  it(
    "runs, persists, promotes, and compares",
    async () => {
      const id = await run(
        Effect.gen(function* () {
          const grid = yield* GridRun;

          return yield* grid.start({
            cases: [
              {
                variables: { task: "the tests already pass, change nothing" },
                name: "already-passing",
                prepare: null,
                source: fixedSource,
                verify: VERIFY_COMMAND,
              },
            ],
            organizationId,
            prompt: "{{task}}",
            startedBy: null,
            /* A case that already passes, so the agent has nothing to do and
               the cell is deterministic. The test measures the machinery
               around a trial rather than whether a model can fix a bug. */
            tasks: [
              {
                credentials: { harness: codexCredential },
                harness: "codex",
                harnessVersion: "0.144.4",
                model: "gpt-5-codex",
                provider: "daytona",
              },
            ],
            trials: 2,
          });
        })
      );

      expect(id).toStartWith("run_");

      /* Poll the record rather than the live copy: what matters is that a
         reader who was not there when it ran can still see it. */
      const settled = await run(
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
                      ? found.value.run.status === "finished"
                      : false,
                  }))
                ),
              while: (state) => !state.done && state.attempts < 40,
            }
          );
        })
      );

      expect(settled.done).toBe(true);

      const stored = await run(
        Effect.gen(function* () {
          const query = yield* RunQuery;

          return yield* query.findRun(organizationId, id);
        })
      );

      expect(Option.isSome(stored)).toBe(true);

      if (Option.isNone(stored)) {
        return;
      }

      const cell = stored.value.cells[0];

      expect(cell).toBeDefined();
      expect(cell?.distribution.scored).toBe(2);
      expect(cell?.distribution.passRate).toBe(1);
      expect(cell?.trials).toHaveLength(2);

      if (cell === undefined) {
        return;
      }

      const accepted = await run(
        Effect.gen(function* () {
          const baselines = yield* Baselines;

          return yield* baselines.find(
            organizationId,
            CellKey.make(cell.cell.cellKey)
          );
        })
      );

      /* The grid accepted this reading as the cell completed. Nothing in this
         test promoted it, which is the point: a comparison that depended on
         someone pressing a button was absent for seven cells in ten. */
      expect(Option.isSome(accepted)).toBe(true);

      if (Option.isNone(accepted)) {
        return;
      }

      expect(accepted.value.distribution.passRate).toBe(1);

      /* Comparing the run against itself must be unchanged rather than
         improved or regressed: a baseline promoted from this very cell is
         the same reading. */
      const comparisons = await run(
        Effect.gen(function* () {
          const baselines = yield* Baselines;

          return yield* baselines.compareRun(organizationId, id);
        })
      );

      const verdict = comparisons[0]?.comparison;

      expect(verdict && Option.isSome(verdict)).toBe(true);

      if (!verdict || Option.isNone(verdict)) {
        return;
      }

      expect(verdict.value.verdict).toBe("unchanged");
      expect(verdict.value.delta).toBe(0);
    },
    { timeout: 300_000 }
  );
});
