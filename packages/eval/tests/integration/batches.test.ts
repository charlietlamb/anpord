import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@sphynx/db/client";
import { evalBatch } from "@sphynx/db/schema/evals/eval-batches";
import { evalCaseVersion } from "@sphynx/db/schema/evals/eval-case-versions";
import { evalCase } from "@sphynx/db/schema/evals/eval-cases";
import { evalRun } from "@sphynx/db/schema/evals/eval-runs";
import { evalSuite } from "@sphynx/db/schema/evals/eval-suites";
import { evalTrial } from "@sphynx/db/schema/evals/eval-trials";
import { evalVariant } from "@sphynx/db/schema/evals/eval-variants";
import { skipWithoutDatabase } from "@sphynx/db/test-database";
import type { StartBatchRequest } from "@sphynx/schema/domain/eval-definition";
import { MAX_ORGANIZATION_RUNS_IN_FLIGHT } from "@sphynx/schema/domain/eval-quota";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Cause, Effect, Exit, ManagedRuntime, Option, Redacted } from "effect";
import { Batches } from "../../src/batch/batches";
import { BatchRepository } from "../../src/repositories/batch-repository";
import type { AgentTrialRequest } from "../../src/services/agent-trial";
import { EvalReads } from "../../src/services/eval-reads";
import { seedOrganization, seedRun } from "../fixtures/eval-rows";
import {
  actorOf,
  capturingRunner,
  caseOf,
  connectionOf,
  type Dispatched,
  evalStack,
  events,
  FAILING,
  refusingRunner,
  requestOf,
  scriptedAgent,
  seedConnections,
  UNREACHABLE,
  variantOf,
} from "../fixtures/eval-stack";

const suffix = Date.now();
const organizationId = `org_batches_${suffix}`;
const crowdedId = `org_crowded_${suffix}`;
const quietId = `org_quiet_${suffix}`;
const localCrowdId = `org_local_crowd_${suffix}`;
const raceId = `org_race_${suffix}`;
const actor = actorOf(organizationId);
const dispatched: Dispatched[] = [];
const seen: AgentTrialRequest[] = [];

const runtime = ManagedRuntime.make(
  evalStack({
    agent: scriptedAgent(seen),
    runner: capturingRunner(dispatched),
  })
);

type Services = Batches | BatchRepository | Database | EvalReads;

const run = <A, E>(effect: Effect.Effect<A, E, Services>) =>
  runtime.runPromise(effect);

const exitOf = <A, E>(effect: Effect.Effect<A, E, Services>) =>
  runtime.runPromiseExit(effect);

const failureOf = <A, E>(exit: Exit.Exit<A, E>) =>
  Exit.isFailure(exit)
    ? Option.getOrNull(Cause.failureOption(exit.cause))
    : null;

const query = <A>(use: (db: Database["Type"]) => Promise<A>) =>
  run(Database.pipe(Effect.flatMap((db) => Effect.promise(() => use(db)))));

const start = (request: StartBatchRequest, who = actor) =>
  run(Batches.pipe(Effect.flatMap((batches) => batches.start(who, request))));

const execute = (batchId: string) =>
  run(Batches.pipe(Effect.flatMap((batches) => batches.execute(batchId))));

const runsOf = (batchInternalId: string) =>
  query((db) =>
    db
      .select()
      .from(evalRun)
      .where(eq(evalRun.batchInternalId, batchInternalId))
      .orderBy(asc(evalRun.internalId))
  );

const batchRow = (batchInternalId: string) =>
  query((db) =>
    db.select().from(evalBatch).where(eq(evalBatch.internalId, batchInternalId))
  ).then((rows) => rows[0]);

const versionsOf = (caseId: string, organization = organizationId) =>
  query((db) =>
    db
      .select({ version: evalCaseVersion })
      .from(evalCaseVersion)
      .innerJoin(
        evalCase,
        eq(evalCase.internalId, evalCaseVersion.caseInternalId)
      )
      .where(
        and(eq(evalCase.organizationId, organization), eq(evalCase.id, caseId))
      )
      .orderBy(asc(evalCaseVersion.createdAt))
  ).then((rows) => rows.map((row) => row.version));

const variantsOf = (caseId: string) =>
  query((db) =>
    db
      .select({ variant: evalVariant })
      .from(evalVariant)
      .innerJoin(evalCase, eq(evalCase.internalId, evalVariant.caseInternalId))
      .where(
        and(
          eq(evalCase.organizationId, organizationId),
          eq(evalCase.id, caseId)
        )
      )
  ).then((rows) => rows.map((row) => row.variant));

const twoByTwo = requestOf({
  cases: [
    caseOf("pay", { tags: ["billing"], variables: { task: "pay the bill" } }),
    caseOf("refund", { variables: { task: "refund the order" } }),
  ],
  trials: 2,
  variants: [
    variantOf(),
    variantOf({ harness: "claude", model: "sonnet", sandbox: "e2b" }),
  ],
});

describe.skipIf(skipWithoutDatabase())("batches against the record", () => {
  const started: Record<string, string> = {};

  beforeAll(async () => {
    await query(async (db) => {
      await seedOrganization(db, organizationId);
      await seedConnections(db, organizationId);
      await seedOrganization(db, crowdedId);
      await seedConnections(db, crowdedId);
      await seedOrganization(db, quietId);
      await seedConnections(db, quietId);
      await seedOrganization(db, localCrowdId);
      await seedConnections(db, localCrowdId);
      await seedOrganization(db, raceId);
      await seedConnections(db, raceId);
    });
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  it("registers the suite, cases, versions and variants and opens one run per case and variant", async () => {
    const batch = await start(twoByTwo);
    started.first = batch.id;

    expect(batch.runs.map((entry) => entry.caseId)).toEqual([
      "pay",
      "pay",
      "refund",
      "refund",
    ]);
    expect(dispatched.map((entry) => entry.batchId)).toContain(batch.id);

    const suite = await query((db) =>
      db
        .select()
        .from(evalSuite)
        .where(
          and(
            eq(evalSuite.organizationId, organizationId),
            eq(evalSuite.id, "checkout")
          )
        )
    );
    expect(suite.map((row) => row.name)).toEqual(["Checkout"]);

    const [payVersion] = await versionsOf("pay");
    expect(payVersion?.prompt).toBe("pay the bill");
    expect(payVersion?.tags).toEqual(["billing"]);
    expect(payVersion?.verify).toBe("npm test");
    expect(await versionsOf("refund")).toHaveLength(1);

    const variants = await variantsOf("pay");
    expect(
      variants
        .map((row) => `${row.harness}/${row.model}/${row.sandbox}`)
        .toSorted()
    ).toEqual(["claude/sonnet/e2b", "codex/gpt-5/daytona"]);
    expect(variants.every((row) => row.userModel === null)).toBe(true);

    const runs = await runsOf(batch.id);
    expect(runs).toHaveLength(4);
    expect(batch.runs.map((entry) => entry.variantId).toSorted()).toEqual(
      runs.map((row) => row.variantInternalId).toSorted()
    );
    expect(
      batch.runs
        .filter((entry) => entry.caseId === "pay")
        .map((entry) => entry.variantId)
        .toSorted()
    ).toEqual(variants.map((row) => row.internalId).toSorted());
    expect(new Set(runs.map((row) => row.variantInternalId)).size).toBe(4);
    expect(runs.every((row) => row.status === "running")).toBe(true);
    expect(runs.every((row) => row.trialCount === 2)).toBe(true);
    expect(runs.every((row) => row.harnessVersion.length > 0)).toBe(true);

    const payCodex = runs.find((row) => row.internalId === batch.runs[0]?.id);
    expect(payCodex?.caseVersionInternalId).toBe(payVersion?.internalId);
    expect(payCodex?.harnessCredentialRef).toBe(
      connectionOf(organizationId, "codex")
    );
    expect(payCodex?.harnessCredentialRevision).toBe(1);
    expect(payCodex?.sandboxCredentialRef).toBe(
      connectionOf(organizationId, "daytona")
    );

    const row = await batchRow(batch.id);
    expect(row?.status).toBe("running");
    expect(row?.local).toBe(false);
    expect(row?.trigger).toEqual({ source: "ci" });
  });

  it("reuses the version and variants of a case registered again unchanged", async () => {
    const again = await start(twoByTwo);
    started.second = again.id;

    const first = await runsOf(started.first ?? "");
    const second = await runsOf(again.id);

    expect(again.id).not.toBe(started.first);
    expect(second.map((row) => row.variantInternalId).toSorted()).toEqual(
      first.map((row) => row.variantInternalId).toSorted()
    );
    expect(new Set(second.map((row) => row.caseVersionInternalId))).toEqual(
      new Set(first.map((row) => row.caseVersionInternalId))
    );
    expect(await versionsOf("pay")).toHaveLength(1);
    expect(await variantsOf("pay")).toHaveLength(2);
    await execute(again.id);
  });

  it("gives a case whose prompt changed a new version on the same variants", async () => {
    const edited = await start(
      requestOf({
        ...twoByTwo,
        cases: [
          caseOf("pay", {
            tags: ["billing"],
            variables: { task: "pay the bill twice" },
          }),
        ],
      })
    );

    const versions = await versionsOf("pay");
    const runs = await runsOf(edited.id);
    const first = await runsOf(started.first ?? "");

    expect(versions.map((version) => version.prompt)).toEqual([
      "pay the bill",
      "pay the bill twice",
    ]);
    expect(versions[0]?.definitionHash).not.toBe(versions[1]?.definitionHash);
    expect(
      runs.every((row) => row.caseVersionInternalId === versions[1]?.internalId)
    ).toBe(true);
    expect(await variantsOf("pay")).toHaveLength(2);
    expect(
      runs.every((row) =>
        first.some((prior) => prior.variantInternalId === row.variantInternalId)
      )
    ).toBe(true);

    const detail = await run(
      EvalReads.pipe(
        Effect.flatMap((reads) => reads.case(organizationId, "pay"))
      )
    );
    expect(detail.versions.map((version) => version.changes)).toEqual([
      [],
      ["prompt"],
    ]);
    expect(detail.setup.prompt).toBe("pay the bill twice");
    await execute(edited.id);
  });

  it("keeps a new tag on the version it already has", async () => {
    const retagged = await start(
      requestOf({
        ...twoByTwo,
        cases: [
          caseOf("refund", {
            tags: ["slow"],
            variables: { task: "refund the order" },
          }),
        ],
      })
    );

    const versions = await versionsOf("refund");

    expect(versions).toHaveLength(1);
    expect(versions[0]?.tags).toEqual(["slow"]);
    await execute(retagged.id);
  });

  it("hands every trial the turn and time limits its case stored", async () => {
    const limited = await start(
      requestOf({
        ...twoByTwo,
        cases: [
          caseOf("slow", {
            maxTurns: 3,
            timeoutMs: 1_800_000,
            variables: { task: "take your time" },
          }),
        ],
      })
    );
    seen.length = 0;

    await execute(limited.id);

    expect(
      (await versionsOf("slow")).map((version) => [
        version.maxTurns,
        version.timeoutMs,
      ])
    ).toEqual([[3, 1_800_000]]);
    expect(
      seen.map((request) => [
        request.maxTurns,
        request.timeoutMs,
        request.autoStopMinutes,
      ])
    ).toEqual(Array.from({ length: 4 }, () => [3, 1_800_000, 30]));
  });

  it("runs every trial of a batch and settles its runs and the batch", async () => {
    const batchId = started.first ?? "";
    const work = dispatched.find((entry) => entry.batchId === batchId);
    seen.length = 0;

    await run(work?.work ?? Effect.void);

    const batch = await run(
      EvalReads.pipe(
        Effect.flatMap((reads) => reads.batch(organizationId, batchId))
      )
    );

    expect(batch.status).toBe("finished");
    expect(batch.failure).toBeNull();
    expect(batch.finishedAt).not.toBeNull();
    expect(batch.runs).toHaveLength(4);
    for (const entry of batch.runs) {
      expect(entry.status).toBe("finished");
      expect(entry.trials.map((trial) => trial.ordinal)).toEqual([1, 2]);
      expect(entry.trials.every((trial) => trial.status === "passed")).toBe(
        true
      );
      expect(entry.distribution.passRate).toBe(1);
      expect(entry.trials[0]?.sandboxId).toBe(`sbx-${entry.variant.model}`);
      expect(entry.trials[0]?.trajectory.length).toBeGreaterThan(0);
    }

    expect(seen).toHaveLength(8);
    expect(
      seen
        .filter((request) => request.harness === "codex")
        .map((request) => request.prompt)
        .toSorted()
    ).toEqual([
      "pay the bill",
      "pay the bill",
      "refund the order",
      "refund the order",
    ]);
    const codex = seen.find((request) => request.harness === "codex");
    expect(codex?.verifyCommand).toBe("npm test");
    expect(
      codex === undefined
        ? null
        : Redacted.value(codex.harnessCredential).connectionId
    ).toBe(connectionOf(organizationId, "codex"));
    expect(
      codex?.sandboxCredentials === undefined
        ? null
        : Redacted.value(codex.sandboxCredentials)
    ).toEqual({ apiKey: "bound-key" });
  });

  it("fails a run whose every trial broke without failing its siblings", async () => {
    const batch = await start(
      requestOf({
        cases: [
          caseOf("steady", { variables: { task: "do the work" } }),
          caseOf("wrong", { variables: { task: `this ${FAILING}` } }),
          caseOf("broken", { variables: { task: `${UNREACHABLE} work` } }),
        ],
        trials: 2,
      })
    );

    expect(await execute(batch.id)).toBe(3);

    const read = await run(
      EvalReads.pipe(
        Effect.flatMap((reads) => reads.batch(organizationId, batch.id))
      )
    );
    const byCase = new Map(read.runs.map((entry) => [entry.case.id, entry]));

    expect(read.status).toBe("failed");
    expect(read.failure).toContain("1 of 3 runs could not run");
    expect(byCase.get("steady")?.status).toBe("finished");
    expect(byCase.get("steady")?.distribution.passed).toBe(2);
    expect(byCase.get("wrong")?.status).toBe("finished");
    expect(byCase.get("wrong")?.distribution.failed).toBe(2);
    expect(byCase.get("broken")?.status).toBe("failed");
    expect(byCase.get("broken")?.trials.map((trial) => trial.status)).toEqual([
      "void",
      "void",
    ]);
    expect(byCase.get("broken")?.trials.map((trial) => trial.failure)).toEqual([
      "the provider refused every sandbox",
      "the provider refused every sandbox",
    ]);
    expect(byCase.get("steady")?.trials[0]?.failure).toBeNull();
  });

  it("refuses to execute a batch that has no runs", async () => {
    const exit = await exitOf(
      Batches.pipe(Effect.flatMap((batches) => batches.execute("bat_missing")))
    );

    expect(failureOf(exit)).toMatchObject({ _tag: "NotRunnable" });
  });

  it("runs a case again on each variant's newest run", async () => {
    const templates = await runsOf(started.second ?? "");
    const again = await run(
      Batches.pipe(
        Effect.flatMap((batches) =>
          batches.runCase({
            actor,
            caseId: "refund",
            hostedOnly: true,
            trials: 3,
            trigger: { source: "dashboard" },
            variantIds: null,
          })
        )
      )
    );
    const runs = await runsOf(again.id);
    const versions = await versionsOf("refund");

    expect(again.runs).toHaveLength(2);
    expect(again.runs.every((entry) => entry.caseId === "refund")).toBe(true);
    expect(runs.every((row) => row.trialCount === 3)).toBe(true);
    expect(
      runs.every(
        (row) => row.caseVersionInternalId === versions.at(-1)?.internalId
      )
    ).toBe(true);
    expect(
      runs.every((row) =>
        templates.some(
          (prior) => prior.variantInternalId === row.variantInternalId
        )
      )
    ).toBe(true);
    expect((await batchRow(again.id))?.trigger).toEqual({
      source: "dashboard",
    });
    expect(dispatched.map((entry) => entry.batchId)).toContain(again.id);
    await execute(again.id);
  });

  it("runs a case again on one variant", async () => {
    const [variant] = await variantsOf("refund");
    const again = await run(
      Batches.pipe(
        Effect.flatMap((batches) =>
          batches.runCase({
            actor,
            caseId: "refund",
            hostedOnly: true,
            trials: 1,
            trigger: { source: "dashboard" },
            variantIds: [variant?.internalId ?? ""],
          })
        )
      )
    );
    const runs = await runsOf(again.id);

    expect(runs.map((row) => row.variantInternalId)).toEqual([
      variant?.internalId ?? "",
    ]);
    expect(again.runs.map((entry) => entry.variantId)).toEqual([
      variant?.internalId ?? "",
    ]);
    await execute(again.id);
  });

  it("refuses to run a case it does not know, or on a variant it never ran", async () => {
    const runCase = (caseId: string, variantIds: readonly string[] | null) =>
      exitOf(
        Batches.pipe(
          Effect.flatMap((batches) =>
            batches.runCase({
              actor,
              caseId,
              hostedOnly: true,
              trials: 1,
              trigger: { source: "api" },
              variantIds,
            })
          )
        )
      );

    expect(failureOf(await runCase("nothing-here", null))).toMatchObject({
      _tag: "EvalNotFound",
      entity: "case",
    });
    const [known] = await variantsOf("refund");
    expect(
      failureOf(
        await runCase("refund", [known?.internalId ?? "", "evar_unknown"])
      )
    ).toMatchObject({
      _tag: "NotRunnable",
      problems: ["this case has not run on evar_unknown"],
    });
  });

  it("runs a case again as it was last registered, even when that definition is an older one", async () => {
    const register = async (task: string) => {
      const batch = await start(
        requestOf({ cases: [caseOf("reverted", { variables: { task } })] })
      );
      await execute(batch.id);
    };
    await register("first wording");
    await register("second wording");
    await register("first wording");

    const again = await run(
      Batches.pipe(
        Effect.flatMap((batches) =>
          batches.runCase({
            actor,
            caseId: "reverted",
            hostedOnly: true,
            trials: 1,
            trigger: { source: "dashboard" },
            variantIds: null,
          })
        )
      )
    );
    const versions = await versionsOf("reverted");
    const [repeated] = await runsOf(again.id);

    expect(versions.map((version) => version.prompt)).toEqual([
      "first wording",
      "second wording",
    ]);
    expect(repeated?.caseVersionInternalId).toBe(versions[0]?.internalId);
    await execute(again.id);
  });

  it("refuses to repeat a local run from the platform", async () => {
    const laptop = await start(
      requestOf({
        cases: [caseOf("on-laptop")],
        local: true,
        variants: [variantOf({ sandbox: "local" })],
      })
    );

    const exit = await exitOf(
      Batches.pipe(
        Effect.flatMap((batches) =>
          batches.runCase({
            actor,
            caseId: "on-laptop",
            hostedOnly: true,
            trials: 1,
            trigger: { source: "dashboard" },
            variantIds: null,
          })
        )
      )
    );

    expect(failureOf(exit)).toMatchObject({ _tag: "NotRunnable" });
    await run(
      Batches.pipe(
        Effect.flatMap((batches) => batches.finish(organizationId, laptop.id))
      )
    );
  });

  describe("a local batch", () => {
    const local: { batchId: string; runId: string } = {
      batchId: "",
      runId: "",
    };

    it("is not dispatched, and takes the trials its caller reports", async () => {
      const before = dispatched.length;
      const batch = await start(
        requestOf({ cases: [caseOf("reported")], local: true, trials: 2 })
      );
      local.batchId = batch.id;
      local.runId = batch.runs[0]?.id ?? "";

      expect(dispatched).toHaveLength(before);
      expect((await batchRow(batch.id))?.local).toBe(true);

      await run(
        Batches.pipe(
          Effect.flatMap((batches) =>
            batches.report(organizationId, {
              events,
              ordinal: 1,
              outcome: {
                artifacts: [],
                commandCount: 4,
                exitCode: 0,
                modelMs: 10,
                sandboxMs: 5,
                status: "passed",
                validations: [],
                verifySteps: [],
                voidFields: [],
              },
              runId: local.runId,
              sandboxId: "laptop",
              usage: null,
              userSpend: null,
            })
          )
        )
      );

      const reported = await run(
        EvalReads.pipe(
          Effect.flatMap((reads) => reads.run(organizationId, local.runId))
        )
      );

      expect(reported.local).toBe(true);
      expect(reported.status).toBe("running");
      expect(reported.trials).toHaveLength(1);
      expect(reported.trials[0]?.status).toBe("passed");
      expect(reported.trials[0]?.commands).toBe(4);
      expect(reported.trials[0]?.sandboxId).toBe("laptop");
      expect(reported.trials[0]?.trajectory.length).toBeGreaterThan(0);
      expect(reported.trials[0]?.failure).toBeNull();
    });

    it("records a trial its caller could not finish as void, with why", async () => {
      const batch = await start(
        requestOf({ cases: [caseOf("broken")], local: true, trials: 1 })
      );
      const runId = batch.runs[0]?.id ?? "";

      await run(
        Batches.pipe(
          Effect.flatMap((batches) =>
            batches.report(organizationId, {
              events,
              failure: "The agent ran past its time limit of 1s",
              ordinal: 1,
              runId,
              sandboxId: null,
              usage: null,
            })
          )
        )
      );

      const trials = await query((db) =>
        db
          .select({ failure: evalTrial.failure, status: evalTrial.status })
          .from(evalTrial)
          .where(eq(evalTrial.runInternalId, runId))
      );
      const reported = await run(
        EvalReads.pipe(
          Effect.flatMap((reads) => reads.run(organizationId, runId))
        )
      );

      expect(trials).toEqual([
        { failure: "The agent ran past its time limit of 1s", status: "void" },
      ]);
      expect(reported.trials[0]?.trajectory.length).toBeGreaterThan(0);
      expect(reported.trials[0]?.failure).toBe(
        "The agent ran past its time limit of 1s"
      );
    });

    it("refuses a report for a run it does not hold or one on the platform", async () => {
      const report = (runId: string) =>
        exitOf(
          Batches.pipe(
            Effect.flatMap((batches) =>
              batches.report(organizationId, {
                events: [],
                ordinal: 1,
                outcome: {
                  artifacts: [],
                  commandCount: 0,
                  exitCode: 0,
                  modelMs: 0,
                  sandboxMs: 0,
                  status: "passed",
                  validations: [],
                  verifySteps: [],
                  voidFields: [],
                },
                runId,
                sandboxId: null,
                usage: null,
                userSpend: null,
              })
            )
          )
        );
      const hosted = (await runsOf(started.first ?? ""))[0]?.internalId ?? "";

      expect(failureOf(await report("run_missing"))).toMatchObject({
        _tag: "EvalNotFound",
        entity: "run",
      });
      expect(failureOf(await report(hosted))).toMatchObject({
        _tag: "NotRunnable",
      });
    });

    it("hears a beat from its caller, and refuses one for a batch on the platform", async () => {
      const before = Date.now();
      await run(
        Batches.pipe(
          Effect.flatMap((batches) =>
            batches.beat(organizationId, local.batchId)
          )
        )
      );
      const hosted = await exitOf(
        Batches.pipe(
          Effect.flatMap((batches) =>
            batches.beat(organizationId, started.first ?? "")
          )
        )
      );

      expect(
        (await batchRow(local.batchId))?.lastSeenAt?.getTime()
      ).toBeGreaterThanOrEqual(before - 1000);
      expect(failureOf(hosted)).toMatchObject({ _tag: "NotRunnable" });
    });

    it("leases the caller its harness credential and nothing else", async () => {
      const lease = await run(
        Batches.pipe(
          Effect.flatMap((batches) =>
            batches.lease(actor, local.batchId, "codex")
          )
        )
      );
      const hosted = await exitOf(
        Batches.pipe(
          Effect.flatMap((batches) =>
            batches.lease(actor, started.first ?? "", "codex")
          )
        )
      );

      expect(lease.values).toEqual({ apiKey: "codex-key" });
      expect(failureOf(hosted)).toMatchObject({ _tag: "NotRunnable" });
    });

    it("finishes with its open runs, voiding the trial it never reported", async () => {
      await run(
        Batches.pipe(
          Effect.flatMap((batches) =>
            batches.finish(organizationId, local.batchId)
          )
        )
      );

      const runs = await runsOf(local.batchId);
      const batch = await batchRow(local.batchId);

      expect(runs.map((row) => row.status)).toEqual(["finished"]);
      expect(runs[0]?.finishedAt).not.toBeNull();
      expect(batch?.status).toBe("finished");
      expect(batch?.failure).toBeNull();

      const finished = await run(
        EvalReads.pipe(
          Effect.flatMap((reads) => reads.run(organizationId, local.runId))
        )
      );
      expect(
        finished.trials.map((trial) => [trial.ordinal, trial.status])
      ).toEqual([
        [1, "passed"],
        [2, "void"],
      ]);
    });

    it("takes a repeated finish as done", async () => {
      await run(
        Batches.pipe(
          Effect.flatMap((batches) =>
            batches.finish(organizationId, local.batchId)
          )
        )
      );

      expect((await batchRow(local.batchId))?.status).toBe("finished");
    });

    it("refuses to finish a batch on the platform or in another organization", async () => {
      const finish = (organization: string, batchId: string) =>
        exitOf(
          Batches.pipe(
            Effect.flatMap((batches) => batches.finish(organization, batchId))
          )
        );

      expect(
        failureOf(await finish(organizationId, started.first ?? ""))
      ).toMatchObject({ _tag: "NotRunnable" });
      expect(failureOf(await finish(crowdedId, local.batchId))).toMatchObject({
        _tag: "EvalNotFound",
        entity: "batch",
      });
    });

    it("refuses a beat, a report and a finish once sphynx closed it, and stays failed", async () => {
      const batch = await start(
        requestOf({ cases: [caseOf("went-quiet")], local: true, trials: 1 })
      );
      const runId = batch.runs[0]?.id ?? "";
      const closedAt = new Date("2026-09-01T00:00:00Z");
      await query(async (db) => {
        await db
          .update(evalBatch)
          .set({
            failure: "abandoned: the machine running this stopped reporting",
            finishedAt: closedAt,
            status: "failed",
          })
          .where(eq(evalBatch.internalId, batch.id));
        await db
          .update(evalRun)
          .set({ finishedAt: closedAt, status: "failed" })
          .where(eq(evalRun.batchInternalId, batch.id));
      });
      const refusal = async (
        effect: Effect.Effect<unknown, unknown, Services>
      ) => {
        const failure = failureOf(await exitOf(effect));
        return failure !== null &&
          typeof failure === "object" &&
          "problems" in failure
          ? failure.problems
          : failure;
      };
      const closed = [
        "Sphynx closed this run after it stopped hearing from this machine, so it no longer takes results. Run the eval again.",
      ];

      expect([
        await refusal(
          Batches.pipe(
            Effect.flatMap((batches) => batches.beat(organizationId, batch.id))
          )
        ),
        await refusal(
          Batches.pipe(
            Effect.flatMap((batches) =>
              batches.report(organizationId, {
                events,
                failure: "The agent ran past its time limit of 1s",
                ordinal: 1,
                runId,
                sandboxId: null,
                usage: null,
              })
            )
          )
        ),
        await refusal(
          Batches.pipe(
            Effect.flatMap((batches) =>
              batches.finish(organizationId, batch.id)
            )
          )
        ),
      ]).toEqual([closed, closed, closed]);

      await run(
        BatchRepository.pipe(
          Effect.flatMap((batches) =>
            batches.finish({
              failure: null,
              finishedAt: new Date(),
              internalId: batch.id,
              status: "finished",
            })
          )
        )
      );

      const row = await batchRow(batch.id);
      expect([
        row?.status,
        row?.finishedAt,
        (await runsOf(batch.id)).map((entry) => entry.status),
        await query((db) =>
          db
            .select({ ordinal: evalTrial.ordinal })
            .from(evalTrial)
            .where(eq(evalTrial.runInternalId, runId))
        ),
      ]).toEqual(["failed", closedAt, ["failed"], []]);
    });
  });

  describe("admission", () => {
    const refusal = async (request: StartBatchRequest, who = actor) =>
      failureOf(
        await exitOf(
          Batches.pipe(Effect.flatMap((batches) => batches.start(who, request)))
        )
      );

    it("refuses two variants that are the same", async () => {
      expect(
        await refusal(
          requestOf({
            cases: [caseOf("twice")],
            variants: [variantOf(), variantOf()],
          })
        )
      ).toMatchObject({ _tag: "StartRefused", retryable: false });
    });

    it("refuses more trials than a batch may hold", async () => {
      const cases = Array.from({ length: 11 }, (_, index) =>
        caseOf(`many-${index}`)
      );

      expect(await refusal(requestOf({ cases, trials: 10 }))).toMatchObject({
        _tag: "StartRefused",
        retryable: false,
      });
      expect(await versionsOf("many-0")).toHaveLength(0);
    });

    it("refuses a batch while the organization has too many going", async () => {
      const crowd = actorOf(crowdedId);
      for (let index = 0; index < MAX_ORGANIZATION_RUNS_IN_FLIGHT; index += 1) {
        await start(requestOf({ cases: [caseOf(`crowd-${index}`)] }), crowd);
      }

      expect(
        await refusal(requestOf({ cases: [caseOf("one-more")] }), crowd)
      ).toMatchObject({ _tag: "StartRefused", retryable: true });
      expect(await versionsOf("one-more", crowdedId)).toHaveLength(0);

      const running = await query((db) =>
        db
          .select({ id: evalBatch.internalId })
          .from(evalBatch)
          .where(
            and(
              eq(evalBatch.organizationId, crowdedId),
              inArray(evalBatch.status, ["running"])
            )
          )
      );
      expect(running).toHaveLength(MAX_ORGANIZATION_RUNS_IN_FLIGHT);
    });

    it("holds the ceiling when starts arrive in the same instant", async () => {
      const crowd = actorOf(raceId);
      const attempts = MAX_ORGANIZATION_RUNS_IN_FLIGHT + 2;
      const outcomes = await Promise.all(
        Array.from({ length: attempts }, (_, index) =>
          exitOf(
            Batches.pipe(
              Effect.flatMap((batches) =>
                batches.start(
                  crowd,
                  requestOf({ cases: [caseOf(`race-${index}`)] })
                )
              )
            )
          )
        )
      );

      const running = await query((db) =>
        db
          .select({ id: evalBatch.internalId })
          .from(evalBatch)
          .where(
            and(
              eq(evalBatch.organizationId, raceId),
              inArray(evalBatch.status, ["running"])
            )
          )
      );

      expect({
        refused: outcomes.filter(Exit.isFailure).length,
        running: running.length,
      }).toEqual({
        refused: attempts - MAX_ORGANIZATION_RUNS_IN_FLIGHT,
        running: MAX_ORGANIZATION_RUNS_IN_FLIGHT,
      });
    });

    it("lets local batches past the ceiling, because they open no sandbox", async () => {
      const crowd = actorOf(localCrowdId);
      const wanted = MAX_ORGANIZATION_RUNS_IN_FLIGHT + 2;
      for (let index = 0; index < wanted; index += 1) {
        await start(
          requestOf({
            cases: [caseOf(`local-crowd-${index}`)],
            local: true,
            variants: [variantOf({ sandbox: "local" })],
          }),
          crowd
        );
      }

      const running = await query((db) =>
        db
          .select({ id: evalBatch.internalId })
          .from(evalBatch)
          .where(
            and(
              eq(evalBatch.organizationId, localCrowdId),
              inArray(evalBatch.status, ["running"])
            )
          )
      );
      expect(running).toHaveLength(wanted);
    });

    it("does not count local batches whose machine went quiet", async () => {
      await query(async (db) => {
        for (
          let index = 0;
          index < MAX_ORGANIZATION_RUNS_IN_FLIGHT;
          index += 1
        ) {
          await seedRun(db, {
            createdAt: new Date(Date.now() - 20 * 60_000),
            lastSeenAt: new Date(Date.now() - 15 * 60_000),
            local: true,
            organizationId: quietId,
            tag: `quiet_${index}_${suffix}`,
          });
        }
      });

      const batch = await start(
        requestOf({ cases: [caseOf("after-quiet")] }),
        actorOf(quietId)
      );

      expect((await batchRow(batch.id))?.status).toBe("running");
    });
  });
});

describe.skipIf(skipWithoutDatabase())("a batch no worker would take", () => {
  const organization = `org_undispatched_${suffix}`;
  const refusing = ManagedRuntime.make(
    evalStack({
      agent: scriptedAgent(),
      runner: refusingRunner,
    })
  );

  afterAll(async () => {
    await refusing.dispose();
  });

  it("is failed rather than left running", async () => {
    await refusing.runPromise(
      Database.pipe(
        Effect.flatMap((db) =>
          Effect.promise(async () => {
            await seedOrganization(db, organization);
            await seedConnections(db, organization);
          })
        )
      )
    );

    const exit = await refusing.runPromiseExit(
      Batches.pipe(
        Effect.flatMap((batches) =>
          batches.start(
            actorOf(organization),
            requestOf({ cases: [caseOf("stranded")] })
          )
        )
      )
    );
    const batches = await refusing.runPromise(
      Database.pipe(
        Effect.flatMap((db) =>
          Effect.promise(() =>
            db
              .select()
              .from(evalBatch)
              .where(eq(evalBatch.organizationId, organization))
          )
        )
      )
    );

    expect(Exit.isFailure(exit)).toBe(true);
    expect(batches.map((row) => row.status)).toEqual(["failed"]);
    expect(batches[0]?.failure).toContain("could not start");
  });
});
