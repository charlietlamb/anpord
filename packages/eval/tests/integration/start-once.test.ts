import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrialCost } from "@anpord/db/schema/evals/eval-trial-costs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import {
  IdempotencyKey,
  type ReportedTrial,
} from "@anpord/schema/public/runner-api";
import { and, count, eq, inArray } from "drizzle-orm";
import { Cause, Effect, Exit, ManagedRuntime, Option } from "effect";
import { Batches } from "../../src/batch/batches";
import { skipWithoutDatabase } from "../fixtures/database";
import { seedOrganization } from "../fixtures/eval-rows";
import {
  actorOf,
  capturingRunner,
  caseOf,
  type Dispatched,
  evalStack,
  events,
  requestOf,
  scriptedAgent,
  seedConnections,
  variantOf,
} from "../fixtures/eval-stack";

const suffix = Date.now();
const ORGANIZATIONS = [
  "retry",
  "race",
  "hosted",
  "fresh",
  "report",
  "rereport",
  "reused",
] as const;
type Organization = (typeof ORGANIZATIONS)[number];
const organizationOf = (name: Organization) =>
  `org_start_once_${name}_${suffix}`;
const dispatched: Dispatched[] = [];

const runtime = ManagedRuntime.make(
  evalStack({ agent: scriptedAgent([]), runner: capturingRunner(dispatched) })
);

const run = <A, E>(effect: Effect.Effect<A, E, Batches | Database>) =>
  runtime.runPromise(effect);

const query = <A>(use: (db: Database["Type"]) => Promise<A>) =>
  run(Database.pipe(Effect.flatMap((db) => Effect.promise(() => use(db)))));

const startOnce = (
  organization: Organization,
  request: StartBatchRequest,
  key: string
) =>
  run(
    Batches.pipe(
      Effect.flatMap((batches) =>
        batches.startOnce(
          actorOf(organizationOf(organization)),
          request,
          IdempotencyKey.make(key)
        )
      )
    )
  );

const report = (trial: ReportedTrial, organization: Organization = "report") =>
  run(
    Batches.pipe(
      Effect.flatMap((batches) =>
        batches.report(organizationOf(organization), trial)
      )
    )
  );

const batchesKeyed = (organization: Organization, key: string) =>
  query((db) =>
    db
      .select({ internalId: evalBatch.internalId })
      .from(evalBatch)
      .where(
        and(
          eq(evalBatch.organizationId, organizationOf(organization)),
          eq(evalBatch.idempotencyKey, key)
        )
      )
  );

const runCount = (batchIds: readonly string[]) =>
  query((db) =>
    db
      .select({ runs: count() })
      .from(evalRun)
      .where(inArray(evalRun.batchInternalId, [...batchIds]))
  ).then((rows) => rows[0]?.runs);

const trialsIn = (runId: string) =>
  query((db) =>
    db
      .select({ failure: evalTrial.failure, status: evalTrial.status })
      .from(evalTrial)
      .where(eq(evalTrial.runInternalId, runId))
  );

const eventsIn = (runId: string) =>
  query((db) =>
    db
      .select({ events: count() })
      .from(evalEvent)
      .innerJoin(evalTrial, eq(evalEvent.trialInternalId, evalTrial.internalId))
      .where(eq(evalTrial.runInternalId, runId))
  ).then((rows) => rows[0]?.events);

const costsIn = (runId: string) =>
  query((db) =>
    db
      .select({ component: evalTrialCost.component })
      .from(evalTrialCost)
      .innerJoin(
        evalTrial,
        eq(evalTrialCost.trialInternalId, evalTrial.internalId)
      )
      .where(eq(evalTrial.runInternalId, runId))
  );

const passed = {
  artifacts: [],
  commandCount: 4,
  exitCode: 0,
  modelMs: 10,
  sandboxMs: 5,
  status: "passed" as const,
  validations: [],
  verifySteps: [],
  voidFields: [],
};

const local = requestOf({
  cases: [caseOf("pay"), caseOf("refund")],
  local: true,
  trials: 1,
  variants: [variantOf({ sandbox: "local" })],
});

const hosted = requestOf({
  cases: [caseOf("pay")],
  trials: 1,
  variants: [variantOf()],
});

describe.skipIf(skipWithoutDatabase())("starting a batch once", () => {
  beforeAll(async () => {
    await query(async (db) => {
      for (const name of ORGANIZATIONS) {
        await seedOrganization(db, organizationOf(name));
        await seedConnections(db, organizationOf(name));
      }
    });
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  it("returns the batch the first start made when the retry carries its key", async () => {
    const first = await startOnce("retry", local, "retry-after-502");
    const retried = await startOnce("retry", local, "retry-after-502");
    const byCase = (batch: typeof first.started) =>
      [...batch.runs].sort((a, b) => a.caseId.localeCompare(b.caseId));

    expect(first.replayed).toBe(false);
    expect(retried.replayed).toBe(true);
    expect(retried.started.id).toBe(first.started.id);
    expect(byCase(retried.started)).toEqual(byCase(first.started));
    expect(await batchesKeyed("retry", "retry-after-502")).toEqual([
      { internalId: first.started.id },
    ]);
    expect(await runCount([first.started.id])).toBe(2);
  });

  it("makes one batch when the retry lands while the first start is still running", async () => {
    const [one, two] = await Promise.all([
      startOnce("race", local, "concurrent-retry"),
      startOnce("race", local, "concurrent-retry"),
    ]);

    expect(one.started.id).toBe(two.started.id);
    expect([one.replayed, two.replayed].sort()).toEqual([false, true]);
    expect(await batchesKeyed("race", "concurrent-retry")).toHaveLength(1);
  });

  it("dispatches a hosted batch once however often its start is retried", async () => {
    const before = dispatched.length;
    const first = await startOnce("hosted", hosted, "hosted-retry");
    await startOnce("hosted", hosted, "hosted-retry");

    expect(dispatched.slice(before).map((entry) => entry.batchId)).toEqual([
      first.started.id,
    ]);
  });

  it("refuses a key sent again with a different request, and starts nothing more", async () => {
    const first = await startOnce("reused", local, "reused-key");
    const reordered = await startOnce(
      "reused",
      Object.fromEntries(
        Object.entries(local).toReversed()
      ) as StartBatchRequest,
      "reused-key"
    );
    const changed = await runtime.runPromiseExit(
      Batches.pipe(
        Effect.flatMap((batches) =>
          batches.startOnce(
            actorOf(organizationOf("reused")),
            { ...local, trials: 3 },
            IdempotencyKey.make("reused-key")
          )
        )
      )
    );

    expect(reordered.started.id).toBe(first.started.id);
    expect(
      Exit.isFailure(changed)
        ? Option.getOrNull(Cause.failureOption(changed.cause))
        : null
    ).toMatchObject({
      _tag: "StartRefused",
      reason:
        "This idempotency key already started a different run. Send a new key to start this one.",
      retryable: false,
    });
    expect(await batchesKeyed("reused", "reused-key")).toEqual([
      { internalId: first.started.id },
    ]);
  });

  it("starts a new batch for a new key", async () => {
    const first = await startOnce("fresh", local, "run-one");
    const second = await startOnce("fresh", local, "run-two");

    expect(second.started.id).not.toBe(first.started.id);
    expect(second.replayed).toBe(false);
  });

  it("records a trial reported twice as one trial with one set of events", async () => {
    const { started } = await startOnce("report", local, "reported-twice");
    const runId = started.runs[0]?.id ?? "";
    const trial: ReportedTrial = {
      events,
      userSpend: null,
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
      runId,
      sandboxId: "laptop",
      usage: null,
    };

    await report(trial);
    const trialsOf = () =>
      query((db) =>
        db
          .select({
            commandCount: evalTrial.commandCount,
            internalId: evalTrial.internalId,
            status: evalTrial.status,
          })
          .from(evalTrial)
          .where(eq(evalTrial.runInternalId, runId))
      );
    const [once] = await trialsOf();
    await report(trial);
    const twice = await trialsOf();
    const eventCount = await query((db) =>
      db
        .select({ events: count() })
        .from(evalEvent)
        .where(eq(evalEvent.trialInternalId, once?.internalId ?? ""))
    ).then((rows) => rows[0]?.events);

    expect(twice).toEqual([
      { commandCount: 4, internalId: once?.internalId ?? "", status: "passed" },
    ]);
    expect(eventCount).toBe(events.length);
  });
  it("records a broken trial reported twice as one void trial with its reason", async () => {
    const { started } = await startOnce("report", local, "broken-twice");
    const runId = started.runs[0]?.id ?? "";
    const broken: ReportedTrial = {
      events,
      failure: "The prepare step seeds-orders exited with status 3",
      ordinal: 1,
      runId,
      sandboxId: null,
      usage: null,
    };

    await report(broken);
    await report(broken);

    expect(await trialsIn(runId)).toEqual([
      {
        failure: "The prepare step seeds-orders exited with status 3",
        status: "void",
      },
    ]);
    expect(await eventsIn(runId)).toBe(events.length);
  });

  it("keeps only what the last report of a trial said", async () => {
    const { started } = await startOnce("report", local, "broken-then-scored");
    const runId = started.runs[0]?.id ?? "";
    const base = { events, ordinal: 1, runId, sandboxId: null, usage: null };

    await report({ ...base, failure: "The harness would not start" });
    await report({ ...base, outcome: passed, userSpend: null });

    expect(await trialsIn(runId)).toEqual([
      { failure: null, status: "passed" },
    ]);
  });

  it("drops what a scored report cost when the trial is reported again as broken", async () => {
    const { started } = await startOnce(
      "rereport",
      local,
      "scored-then-broken"
    );
    const runId = started.runs[0]?.id ?? "";
    const base = { events, ordinal: 1, runId, sandboxId: null, usage: null };

    await report({ ...base, outcome: passed, userSpend: null }, "rereport");
    const scoredCosts = (await costsIn(runId)).length;
    await report(
      { ...base, failure: "The harness would not start" },
      "rereport"
    );

    expect(scoredCosts).toBeGreaterThan(0);
    expect(await costsIn(runId)).toEqual([]);
    expect(await trialsIn(runId)).toEqual([
      { failure: "The harness would not start", status: "void" },
    ]);
  });
});
