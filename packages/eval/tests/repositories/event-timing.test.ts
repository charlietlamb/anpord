import { describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Duration, Effect, Layer, Redacted } from "effect";
import {
  EventRepository,
  EventRepositoryLive,
} from "../../src/repositories/event-repository";
import { skipWithoutDatabase } from "../fixtures/database";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = EventRepositoryLive.pipe(
  Layer.provide(IdGeneratorLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 4,
      statementTimeout: Duration.seconds(30),
      url: Redacted.make(URL ?? ""),
    })
  )
);

const suffix = Date.now();
/* A trial that exists, because the journal is keyed to one by a foreign
   key: an invented id cannot be inserted against. */
const trialId = process.env.EVAL_TEST_TRIAL_ID ?? "";

const run = <A, E>(effect: Effect.Effect<A, E, EventRepository | Database>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<A, E>
  );

describe.skipIf(skipWithoutDatabase() || trialId === "")(
  "a journal read back",
  () => {
    /** The moments live in columns rather than in the payload, so a read that
     * returns the payload alone hands back a journal with no timing and every
     * stored trial renders as a bare list. */
    it("carries the timing the columns hold", async () => {
      const started = new Date(1_787_000_000_000);
      const finished = new Date(1_787_000_004_986);

      await run(
        Effect.gen(function* () {
          const db = yield* Database;

          yield* Effect.promise(() =>
            db
              .insert(evalEvent)
              .values({
                internalId: `evt_timing_${suffix}`,
                kind: "Command",
                occurredAt: finished,
                payload: {
                  _tag: "Command",
                  command: "sleep 5",
                  exitCode: 0,
                  output: "",
                },
                seq: 0,
                startedAt: started,
                trialInternalId: trialId,
              })
              .onConflictDoNothing()
          );
        })
      );

      const journals = await run(
        Effect.gen(function* () {
          const events = yield* EventRepository;

          return yield* events.listByTrials([trialId]);
        })
      );

      const entry = journals.get(trialId)?.[0];

      if (entry?._tag !== "Command") {
        throw new Error("expected a command");
      }

      expect(entry.at).toBe(finished.getTime());
      expect(entry.startedAt).toBe(started.getTime());
      /* The measured duration of the sleep, which is what a bar is drawn from. */
      expect((entry.at ?? 0) - (entry.startedAt ?? 0)).toBe(4986);
    });
  }
);
