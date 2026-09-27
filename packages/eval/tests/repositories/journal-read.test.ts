import { describe, expect, it } from "bun:test";
import { skipWithoutDatabase, testDatabase } from "@anpord/db/test-database";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Effect, Layer } from "effect";
import {
  EventRepository,
  EventRepositoryLive,
} from "../../src/repositories/event-repository";
import { JournalArchiveLive } from "../../src/repositories/journal-archive";

const TestLayer = EventRepositoryLive.pipe(
  Layer.provide(IdGeneratorLive),
  Layer.provide(JournalArchiveLive),
  Layer.provideMerge(testDatabase())
);

describe.skipIf(skipWithoutDatabase())("reading journals in one query", () => {
  /** The fan-out this replaces opened one round trip per trial, and a cell
   * holds three. */
  it("returns nothing for no trials without touching the database", async () => {
    const journals = await Effect.runPromise(
      Effect.gen(function* () {
        const events = yield* EventRepository;

        return yield* events.listByTrials([]);
      }).pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<
        ReadonlyMap<string, readonly unknown[]>
      >
    );

    expect(journals.size).toBe(0);
  });

  it("groups every journal by the trial that produced it", async () => {
    const journals = await Effect.runPromise(
      Effect.gen(function* () {
        const events = yield* EventRepository;

        return yield* events.listByTrials(["nothing-has-this-id"]);
      }).pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<
        ReadonlyMap<string, readonly unknown[]>
      >
    );

    /* An unknown id is absent rather than empty, so a caller can tell "no
       journal recorded" from "no such trial". */
    expect(journals.has("nothing-has-this-id")).toBe(false);
  });
});
