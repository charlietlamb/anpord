import { beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalTrialJournal } from "@anpord/db/schema/evals/eval-trial-journal";
import { IdGeneratorLive } from "@anpord/ids/layer";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import type { TrialOutcome } from "@anpord/schema/domain/trial";
import { eq } from "drizzle-orm";
import { Duration, Effect, Layer } from "effect";
import {
  EventRepository,
  EventRepositoryLive,
} from "../../src/repositories/event-repository";
import {
  JournalArchive,
  JournalArchiveLive,
} from "../../src/repositories/journal-archive";
import {
  TrialRecorder,
  TrialRecorderLive,
} from "../../src/repositories/trial-record";
import { skipWithoutDatabase, testDatabase } from "../fixtures/database";
import { seedOrganization, seedRun } from "../fixtures/eval-rows";

const TestLayer = Layer.mergeAll(
  JournalArchiveLive,
  EventRepositoryLive.pipe(Layer.provide(JournalArchiveLive)),
  TrialRecorderLive
).pipe(Layer.provide(IdGeneratorLive), Layer.provideMerge(testDatabase()));

const suffix = Date.now();
const organizationId = `org_arc_${suffix}`;
const runInternalId = `erun_arc_${suffix}`;

const DAY = Duration.toMillis(Duration.days(1));
const cutoff = new Date(suffix - 30 * DAY);
const cold = new Date(suffix - 40 * DAY);

const outcome: TrialOutcome = {
  artifacts: [],
  commandCount: 1,
  exitCode: 0,
  modelMs: 1000,
  sandboxMs: 500,
  status: "passed",
  validations: [],
  verifySteps: [],
  voidFields: [],
};

const events: readonly HarnessEvent[] = [
  {
    _tag: "Started",
    at: 1_787_000_000_000,
    model: "gpt-5",
    sessionId: "session_1",
  },
  {
    _tag: "Command",
    at: 1_787_000_004_986,
    command: "bun test",
    exitCode: 0,
    output: "ok",
    startedAt: 1_787_000_000_000,
  },
  { _tag: "Finished", at: 1_787_000_005_000, reason: "done" },
];

type Services = EventRepository | JournalArchive | TrialRecorder | Database;

const run = <A, E>(effect: Effect.Effect<A, E, Services>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<A, E>
  );

const journalled = (input: {
  readonly ordinal: number;
  readonly settled: boolean;
  readonly writtenAt: Date;
}) =>
  Effect.gen(function* () {
    const recorder = yield* TrialRecorder;
    const db = yield* Database;

    const { trialInternalId } = yield* recorder.open({
      ordinal: input.ordinal,
      runInternalId,
      startedAt: new Date(),
    });

    yield* recorder.append({ events, from: 0, trialInternalId });

    if (input.settled) {
      yield* recorder.settle({
        finishedAt: new Date(),
        outcome,
        sandboxId: null,
        trialInternalId,
        usage: null,
      });
    }

    yield* Effect.promise(() =>
      db
        .update(evalEvent)
        .set({ at: input.writtenAt })
        .where(eq(evalEvent.trialInternalId, trialInternalId))
    );

    return trialInternalId;
  });

const stored = (trialInternalId: string) =>
  Effect.gen(function* () {
    const db = yield* Database;

    return yield* Effect.promise(async () => ({
      archives: await db
        .select()
        .from(evalTrialJournal)
        .where(eq(evalTrialJournal.trialInternalId, trialInternalId)),
      rows: await db
        .select()
        .from(evalEvent)
        .where(eq(evalEvent.trialInternalId, trialInternalId)),
    }));
  });

describe.skipIf(skipWithoutDatabase())("JournalArchive", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;

        yield* Effect.promise(async () => {
          await seedOrganization(db, organizationId);
          await seedRun(db, {
            organizationId,
            tag: `arc_${suffix}`,
            trialCount: 4,
          });
        });
      })
    );
  });

  it("folds a cold settled journal into one row that reads back the same", async () => {
    const seen = await run(
      Effect.gen(function* () {
        const archive = yield* JournalArchive;
        const reader = yield* EventRepository;

        const trialInternalId = yield* journalled({
          ordinal: 1,
          settled: true,
          writtenAt: cold,
        });

        const before = yield* reader.listByTrials([trialInternalId]);
        const compacted = yield* archive.compact({
          limit: 200,
          olderThan: cutoff,
        });
        const after = yield* reader.listByTrials([trialInternalId]);

        return {
          after: after.get(trialInternalId),
          before: before.get(trialInternalId),
          compacted,
          stored: yield* stored(trialInternalId),
        };
      })
    );

    expect(seen.compacted).toBeGreaterThanOrEqual(1);
    expect(seen.stored.rows).toHaveLength(0);
    expect(seen.stored.archives[0]?.eventCount).toBe(events.length);
    expect(seen.before).toEqual(events);
    expect(seen.after).toEqual(seen.before);
  });

  it("leaves a running trial's journal alone however old it is", async () => {
    const seen = await run(
      Effect.gen(function* () {
        const archive = yield* JournalArchive;

        const trialInternalId = yield* journalled({
          ordinal: 2,
          settled: false,
          writtenAt: cold,
        });

        yield* archive.compact({ limit: 200, olderThan: cutoff });

        return yield* stored(trialInternalId);
      })
    );

    expect(seen.rows).toHaveLength(events.length);
    expect(seen.archives).toHaveLength(0);
  });

  it("leaves a settled trial alone while it is still inside the window", async () => {
    const seen = await run(
      Effect.gen(function* () {
        const archive = yield* JournalArchive;

        const trialInternalId = yield* journalled({
          ordinal: 3,
          settled: true,
          writtenAt: new Date(suffix - DAY),
        });

        yield* archive.compact({ limit: 200, olderThan: cutoff });

        return yield* stored(trialInternalId);
      })
    );

    expect(seen.rows).toHaveLength(events.length);
    expect(seen.archives).toHaveLength(0);
  });

  it("drops the archive when the trial is reopened", async () => {
    const seen = await run(
      Effect.gen(function* () {
        const archive = yield* JournalArchive;
        const recorder = yield* TrialRecorder;

        const trialInternalId = yield* journalled({
          ordinal: 4,
          settled: true,
          writtenAt: cold,
        });

        yield* archive.compact({ limit: 200, olderThan: cutoff });
        const archived = yield* stored(trialInternalId);

        yield* recorder.open({
          ordinal: 4,
          runInternalId,
          startedAt: new Date(),
        });

        return { archived, reopened: yield* stored(trialInternalId) };
      })
    );

    expect(seen.archived.archives).toHaveLength(1);
    expect(seen.reopened.archives).toHaveLength(0);
    expect(seen.reopened.rows).toHaveLength(0);
  });
});
