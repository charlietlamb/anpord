import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Duration, Effect, Layer, Option, Redacted } from "effect";
import {
  WorkbenchRepository,
  WorkbenchRepositoryLive,
} from "../../src/repositories/workbench-repository";
import { skipWithoutDatabase } from "../fixtures/database";

const url = process.env.EVAL_TEST_DATABASE_URL;
const database = DatabaseLive.pipe(
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 2,
      statementTimeout: Duration.seconds(10),
      url: Redacted.make(url ?? ""),
    })
  )
);
const TestLayer = Layer.mergeAll(
  WorkbenchRepositoryLive.pipe(
    Layer.provide(Layer.mergeAll(database, IdGeneratorLive))
  ),
  database
);

const suffix = Date.now();
const owner = `org_wb_owner_${suffix}`;
const intruder = `org_wb_intruder_${suffix}`;

const run = <A, E>(
  effect: Effect.Effect<A, E, WorkbenchRepository | Database>
): Promise<A> =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer)) as Effect.Effect<A, E>
  );

describe.skipIf(skipWithoutDatabase())(
  "marking a playground's last run",
  () => {
    beforeAll(() =>
      run(
        Effect.gen(function* () {
          const db = yield* Database;
          const now = new Date();

          yield* Effect.promise(() =>
            db.insert(organization).values([
              {
                createdAt: now,
                id: owner,
                name: "Owner",
                slug: `wb-owner-${suffix}`,
              },
              {
                createdAt: now,
                id: intruder,
                name: "Intruder",
                slug: `wb-intruder-${suffix}`,
              },
            ])
          );
        })
      )
    );

    /* Its sibling `update` filtered on the organisation and this one did not,
     so the two writes against the same table disagreed about what they could
     reach. */
    it("reaches only a playground of the organisation that asked", async () => {
      const outcome = await run(
        Effect.gen(function* () {
          const repository = yield* WorkbenchRepository;
          const created = yield* repository.insert({
            actorId: null,
            name: "owned",
            organizationId: owner,
          });

          yield* repository.markRun({
            internalId: created.internalId,
            organizationId: intruder,
            runId: "evalRun_theirs",
          });

          const untouched = yield* repository.find(owner, created.id);

          yield* repository.markRun({
            internalId: created.internalId,
            organizationId: owner,
            runId: "evalRun_ours",
          });

          return {
            marked: yield* repository.find(owner, created.id),
            untouched,
          };
        })
      );

      expect(Option.map(outcome.untouched, (row) => row.lastRunId)).toEqual(
        Option.some(null)
      );
      expect(Option.map(outcome.marked, (row) => row.lastRunId)).toEqual(
        Option.some("evalRun_ours")
      );
    });
  }
);
