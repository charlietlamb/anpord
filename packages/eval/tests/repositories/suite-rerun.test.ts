import { beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@sphynx/db/client";
import { evalBatch } from "@sphynx/db/schema/evals/eval-batches";
import { evalRun } from "@sphynx/db/schema/evals/eval-runs";
import { skipWithoutDatabase, testDatabase } from "@sphynx/db/test-database";
import { Effect, Option } from "effect";
import { suiteRerunQuery } from "../../src/repositories/suite-rerun-query";
import { seedOrganization, seedRun, seedTrial } from "../fixtures/eval-rows";

const TestLayer = testDatabase();

const suffix = Date.now();
const organizationId = `org_tie_${suffix}`;
const tag = `tie_${suffix}`;
const sameMoment = new Date(1_700_000_000_000);
const passedRunId = `erun_${tag}_b`;

const run = <A, E>(effect: Effect.Effect<A, E, Database>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)));

const withDb = <A>(use: (db: Database["Type"]) => Promise<A>) =>
  run(Database.pipe(Effect.flatMap((db) => Effect.promise(() => use(db)))));

describe.skipIf(skipWithoutDatabase())("reading a suite to re-run", () => {
  beforeAll(async () => {
    await withDb(async (db) => {
      await seedOrganization(db, organizationId);

      const failing = await seedRun(db, {
        createdAt: sameMoment,
        organizationId,
        runStatus: "failed",
        tag,
      });
      await seedTrial(db, {
        internalId: `etri_${tag}_failed`,
        ordinal: 1,
        runInternalId: failing.runInternalId,
        status: "failed",
      });

      await db.insert(evalBatch).values({
        createdAt: sameMoment,
        internalId: `ebat_${tag}_b`,
        organizationId,
        status: "finished",
      });
      await db.insert(evalRun).values({
        batchInternalId: `ebat_${tag}_b`,
        caseVersionInternalId: failing.versionInternalId,
        createdAt: sameMoment,
        harnessVersion: "0.144.4",
        internalId: passedRunId,
        status: "finished",
        trialCount: 1,
        variantInternalId: failing.variantInternalId,
      });
      await seedTrial(db, {
        internalId: `etri_${tag}_passed`,
        ordinal: 1,
        runInternalId: passedRunId,
        status: "passed",
      });
    });
  });

  it("settles on one run when two of a variant share a timestamp", async () => {
    const found = await run(
      Effect.flatMap(suiteRerunQuery, (find) =>
        find({ organizationId, suiteId: `suite-${tag}` })
      )
    );
    const [subject] = Option.getOrThrow(found).cases;
    const [result] = subject?.candidate.results ?? [];

    expect(result?.lastRunId).toBe(passedRunId);
    expect(result?.status).toBe("finished");
    expect(result?.distribution.failed).toBe(0);
  });
});
