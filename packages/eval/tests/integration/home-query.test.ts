import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@anpord/db/client";
import type { Db } from "@anpord/db/query";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalSuite } from "@anpord/db/schema/evals/eval-suites";
import { evalTrialCost } from "@anpord/db/schema/evals/eval-trial-costs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import { skipWithoutDatabase } from "@anpord/db/test-database";
import type { EvalHome } from "@anpord/schema/domain/eval-home";
import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { eq } from "drizzle-orm";
import {
  DateTime,
  Effect,
  ManagedRuntime,
  TestClock,
  TestContext,
} from "effect";
import { EvalReads } from "../../src/services/eval-reads";
import {
  capturingRunner,
  evalStack,
  scriptedAgent,
} from "../fixtures/eval-stack";

const suffix = Date.now();
const organizationId = `org_home_${suffix}`;
const emptyOrganizationId = `org_home_empty_${suffix}`;
const NOW = Date.parse("2026-03-10T12:00:00.000Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const runtime = ManagedRuntime.make(
  evalStack({ agent: scriptedAgent(), runner: capturingRunner([]) })
);

const home = (organization: string) =>
  runtime.runPromise(
    Effect.gen(function* () {
      yield* TestClock.setTime(NOW);
      return yield* (yield* EvalReads).home({
        organizationId: organization,
        range: "7d",
      });
    }).pipe(Effect.provide(TestContext.TestContext))
  );

const withDb = (use: (db: Db) => Promise<unknown>) =>
  runtime.runPromise(
    Database.pipe(Effect.flatMap((db) => Effect.promise(() => use(db))))
  );

const validation = (
  name: string,
  status: EvalValidation["status"],
  message: string
): EvalValidation => {
  const empty = {
    format: "text",
    state: "captured",
    text: "",
    truncated: false,
  } as const;
  return {
    calls: [],
    durationMs: 1,
    error: null,
    exitCode: null,
    id: name,
    index: 0,
    input: empty,
    kind: "code",
    logs: [],
    message,
    name,
    output: empty,
    startedAt: null,
    status,
    truncated: false,
  };
};

type TrialSeed = Pick<
  typeof evalTrial.$inferInsert,
  "failure" | "status" | "validations"
> & { readonly estimateNanos?: bigint };

const seedCase = async (
  db: Db,
  input: { readonly caseId: string; readonly suiteId: string }
) => {
  const tag = `${suffix}_${input.caseId}`;
  await db
    .insert(evalSuite)
    .values({
      id: input.suiteId,
      internalId: `esui_${suffix}_${input.suiteId}`,
      name: `Suite ${input.suiteId}`,
      organizationId,
    })
    .onConflictDoNothing();
  await db.insert(evalCase).values({
    id: input.caseId,
    internalId: `ecas_${tag}`,
    name: `Case ${input.caseId}`,
    organizationId,
    suiteInternalId: `esui_${suffix}_${input.suiteId}`,
  });
  await db.insert(evalCaseVersion).values({
    caseInternalId: `ecas_${tag}`,
    definitionHash: tag,
    internalId: `ecav_${tag}`,
    prompt: "fix it",
    source: { kind: "empty" },
  });
  await db.insert(evalVariant).values({
    caseInternalId: `ecas_${tag}`,
    harness: "codex",
    internalId: `evar_${tag}`,
    model: "gpt-5",
    sandbox: "daytona",
  });
  return tag;
};

const seedRun = async (
  db: Db,
  input: {
    readonly at: number;
    readonly name: string;
    readonly status?: string;
    readonly tag: string;
    readonly trials: readonly TrialSeed[];
  }
) => {
  const id = `${input.tag}_${input.name}`;
  const createdAt = new Date(input.at);
  const settled = input.status !== "running";
  await db.insert(evalBatch).values({
    createdAt,
    internalId: `ebat_${id}`,
    organizationId,
    status: settled ? "finished" : "running",
  });
  await db.insert(evalRun).values({
    batchInternalId: `ebat_${id}`,
    caseVersionInternalId: `ecav_${input.tag}`,
    createdAt,
    finishedAt: settled ? new Date(input.at + 60_000) : null,
    harnessVersion: "1",
    internalId: `erun_${id}`,
    status: input.status ?? "finished",
    trialCount: input.trials.length,
    variantInternalId: `evar_${input.tag}`,
  });
  for (const [ordinal, trial] of input.trials.entries()) {
    const trialId = `etri_${id}_${ordinal}`;
    await db.insert(evalTrial).values({
      failure: trial.failure ?? null,
      internalId: trialId,
      ordinal,
      runInternalId: `erun_${id}`,
      status: trial.status,
      validations: trial.validations ?? null,
    });
    if (trial.estimateNanos !== undefined) {
      await db.insert(evalTrialCost).values({
        amountNanos: trial.estimateNanos,
        classification: "estimate",
        component: "agent",
        detail: {},
        explanation: "fixture",
        internalId: `etco_${trialId}`,
        source: "fixture",
        trialInternalId: trialId,
      });
    }
  }
  return `erun_${id}`;
};

const passed: TrialSeed = { status: "passed" };
const failed: TrialSeed = { status: "failed" };

describe.skipIf(skipWithoutDatabase())("the home read model", () => {
  const runs: Record<string, string> = {};
  let result: EvalHome;

  beforeAll(async () => {
    await withDb(async (db) => {
      for (const id of [organizationId, emptyOrganizationId]) {
        await db.insert(organization).values({
          createdAt: new Date(),
          id,
          name: id,
          slug: id,
        });
      }

      const green = await seedCase(db, { caseId: "green", suiteId: "alpha" });
      runs.green = await seedRun(db, {
        at: NOW - 2 * DAY,
        name: "only",
        tag: green,
        trials: [{ ...passed, estimateNanos: 1_500_000_000n }, passed],
      });

      const broken = await seedCase(db, { caseId: "broken", suiteId: "alpha" });
      await seedRun(db, {
        at: NOW - 3 * DAY,
        name: "before",
        tag: broken,
        trials: [passed, passed],
      });
      runs.broken = await seedRun(db, {
        at: NOW - 2 * HOUR,
        name: "after",
        tag: broken,
        trials: [
          {
            status: "failed",
            validations: [
              validation("typechecks", "passed", "fine"),
              validation("pricing matches the brief", "failed", "Expected $10"),
              validation("asked before applying", "error", "threw"),
            ],
          },
          { ...failed, estimateNanos: 250_000_000n },
        ],
      });

      const wobbly = await seedCase(db, { caseId: "wobbly", suiteId: "beta" });
      await seedRun(db, {
        at: NOW - 4 * DAY,
        name: "before",
        tag: wobbly,
        trials: [passed, failed],
      });
      runs.wobbly = await seedRun(db, {
        at: NOW - HOUR,
        name: "after",
        tag: wobbly,
        trials: [passed, { failure: "verify exited 1", status: "failed" }],
      });

      const slow = await seedCase(db, { caseId: "slow", suiteId: "beta" });
      runs.slow = await seedRun(db, {
        at: NOW - 3 * HOUR,
        name: "only",
        tag: slow,
        trials: [
          {
            failure: "The agent ran past its time limit of 10m",
            status: "void",
          },
          { failure: "Sandbox lost: gone", status: "void" },
        ],
      });

      const busy = await seedCase(db, { caseId: "busy", suiteId: "beta" });
      runs.busy = await seedRun(db, {
        at: NOW - 5 * DAY,
        name: "settled",
        tag: busy,
        trials: [passed],
      });
      await seedRun(db, {
        at: NOW - 10 * 60_000,
        name: "live",
        status: "running",
        tag: busy,
        trials: [failed],
      });

      const stale = await seedCase(db, { caseId: "stale", suiteId: "alpha" });
      runs.stale = await seedRun(db, {
        at: NOW - 20 * DAY,
        name: "only",
        tag: stale,
        trials: [{ ...failed, estimateNanos: 9_000_000_000n }],
      });

      const fresh = await seedCase(db, { caseId: "fresh", suiteId: "alpha" });
      await seedRun(db, {
        at: NOW - 60_000,
        name: "live",
        status: "running",
        tag: fresh,
        trials: [passed],
      });
    });

    result = await home(organizationId);
  });

  afterAll(async () => {
    await withDb(async (db) => {
      await db.delete(organization).where(eq(organization.id, organizationId));
      await db
        .delete(organization)
        .where(eq(organization.id, emptyOrganizationId));
    });
    await runtime.dispose();
  });

  const evalFor = (caseId: string) => {
    const found = result.evals.find((entry) => entry.caseId === caseId);
    if (found === undefined) {
      throw new Error(`no eval for ${caseId}`);
    }
    return {
      failure: found.failure,
      finishedAt: DateTime.formatIso(found.finishedAt),
      newlyFailing: found.newlyFailing,
      passed: found.passed,
      runId: found.runId,
      scored: found.scored,
      suite: found.suite,
      unscoredReason: found.unscoredReason,
      variant: found.variant.model,
      verdict: found.verdict,
    };
  };

  it("lists one eval per case and variant with a settled run", () => {
    expect(result.evals.map((entry) => entry.caseId)).toEqual([
      "broken",
      "green",
      "stale",
      "busy",
      "slow",
      "wobbly",
    ]);
  });

  it("judges a run whose trials all pass as passed", () => {
    expect(evalFor("green")).toEqual({
      failure: null,
      finishedAt: "2026-03-08T12:01:00.000Z",
      newlyFailing: false,
      passed: 2,
      runId: runs.green,
      scored: 2,
      suite: { id: "alpha", name: "Suite alpha" },
      unscoredReason: null,
      variant: "gpt-5",
      verdict: "passed",
    });
  });

  it("names the first failing check of a failed run and calls it new after a pass", () => {
    expect(evalFor("broken")).toEqual({
      failure: {
        check: "pricing matches the brief",
        message: "Expected $10",
      },
      finishedAt: "2026-03-10T10:01:00.000Z",
      newlyFailing: true,
      passed: 0,
      runId: runs.broken,
      scored: 2,
      suite: { id: "alpha", name: "Suite alpha" },
      unscoredReason: null,
      variant: "gpt-5",
      verdict: "failed",
    });
  });

  it("calls a mixed run flaky, blames verify, and is not new after another flaky run", () => {
    expect(evalFor("wobbly")).toMatchObject({
      failure: { check: "verify", message: "verify exited 1" },
      newlyFailing: false,
      passed: 1,
      runId: runs.wobbly,
      scored: 2,
      verdict: "flaky",
    });
  });

  it("gives a void run its reason, and a timeout reads as timed out", () => {
    expect(evalFor("slow")).toMatchObject({
      failure: null,
      newlyFailing: false,
      passed: 0,
      runId: runs.slow,
      scored: 0,
      unscoredReason: "Timed out",
      verdict: "unscored",
    });
  });

  it("ignores a newer run that is still running", () => {
    expect(evalFor("busy")).toMatchObject({
      runId: runs.busy,
      verdict: "passed",
    });
  });

  it("does not call a failure older than a day new", () => {
    expect(evalFor("stale")).toMatchObject({
      newlyFailing: false,
      runId: runs.stale,
      verdict: "failed",
    });
  });

  it("buckets scored trials by UTC day, suite and variant within the range", () => {
    expect(result.days).toEqual([
      {
        day: "2026-03-05",
        passed: 1,
        scored: 1,
        suiteId: "beta",
        variant: "codex/gpt-5",
      },
      {
        day: "2026-03-06",
        passed: 1,
        scored: 2,
        suiteId: "beta",
        variant: "codex/gpt-5",
      },
      {
        day: "2026-03-07",
        passed: 2,
        scored: 2,
        suiteId: "alpha",
        variant: "codex/gpt-5",
      },
      {
        day: "2026-03-08",
        passed: 2,
        scored: 2,
        suiteId: "alpha",
        variant: "codex/gpt-5",
      },
      {
        day: "2026-03-10",
        passed: 1,
        scored: 3,
        suiteId: "alpha",
        variant: "codex/gpt-5",
      },
      {
        day: "2026-03-10",
        passed: 1,
        scored: 3,
        suiteId: "beta",
        variant: "codex/gpt-5",
      },
    ]);
  });

  it("sums estimated spend for batches in the range", () => {
    expect(result.spendUsd).toBe(1.75);
  });

  it("lists the five newest batches", () => {
    expect(result.recentBatches.map((recent) => recent.batch.id)).toEqual([
      `ebat_${suffix}_fresh_live`,
      `ebat_${suffix}_busy_live`,
      `ebat_${suffix}_wobbly_after`,
      `ebat_${suffix}_broken_after`,
      `ebat_${suffix}_slow_only`,
    ]);
  });

  it("names what each recent batch ran", () => {
    expect(
      result.recentBatches.map(({ caseName, suiteName, suites }) => ({
        caseName,
        suiteName,
        suites,
      }))
    ).toEqual([
      { caseName: "Case fresh", suiteName: "Suite alpha", suites: 1 },
      { caseName: "Case busy", suiteName: "Suite beta", suites: 1 },
      { caseName: "Case wobbly", suiteName: "Suite beta", suites: 1 },
      { caseName: "Case broken", suiteName: "Suite alpha", suites: 1 },
      { caseName: "Case slow", suiteName: "Suite beta", suites: 1 },
    ]);
  });

  it("returns nothing for an organization with no evals", async () => {
    expect(await home(emptyOrganizationId)).toEqual({
      days: [],
      evals: [],
      range: "7d",
      recentBatches: [],
      spendUsd: 0,
    });
  });
});
