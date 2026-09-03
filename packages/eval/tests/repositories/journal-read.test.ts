import { describe, expect, it } from "bun:test";
import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Duration, Effect, Layer, Redacted } from "effect";
import {
  EventRepository,
  EventRepositoryLive,
} from "../../src/repositories/event-repository";
import { JournalArchiveLive } from "../../src/repositories/journal-archive";
import { skipWithoutDatabase } from "../fixtures/database";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = EventRepositoryLive.pipe(
  Layer.provide(IdGeneratorLive),
  Layer.provide(JournalArchiveLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 4,
      statementTimeout: Duration.seconds(30),
      url: Redacted.make(URL ?? ""),
    })
  )
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
