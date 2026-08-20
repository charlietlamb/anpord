import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { Duration, Effect, Layer, Redacted } from "effect";
import { cellKeyOf } from "../../src/domain/cell";
import type { HarnessEvent } from "../../src/domain/harness-event";
import { EvalRepositoriesLive } from "../../src/layer";
import { EventRepository } from "../../src/repositories/event-repository";
import { RunRepository } from "../../src/repositories/run-repository";
import { TaskRepository } from "../../src/repositories/task-repository";
import { TrialRepository } from "../../src/repositories/trial-repository";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = EvalRepositoriesLive.pipe(
  Layer.provideMerge(DatabaseLive),
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 4,
      statementTimeout: Duration.seconds(15),
      url: Redacted.make(URL ?? ""),
    })
  )
);

const organizationId = `org_ev_${Date.now()}`;

const run = <A, E>(effect: Effect.Effect<A, E, any>) =>
  Effect.runPromise(
    Effect.provide(effect, TestLayer) as Effect.Effect<A, E, never>
  );

const events: HarnessEvent[] = [
  { _tag: "Started", model: "gpt-5.2", sessionId: "thread-1" },
  { _tag: "Command", command: "bun test", exitCode: 1, output: "F" },
  { _tag: "FileChange", paths: ["/tmp/w/total.ts"] },
  { _tag: "Command", command: "bun test", exitCode: 0, output: "1 pass" },
  { _tag: "Finished", reason: "turn.completed" },
];

describe.if(Boolean(URL))("the journal against a real database", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;
        yield* Effect.promise(() =>
          db.insert(organization).values({
            createdAt: new Date(),
            id: organizationId,
            name: "events",
            slug: organizationId,
          })
        );
      })
    );
  });

  /* The journal is what makes an exit code recoverable after the sandbox is
     gone, so its order has to survive the round trip: a command and the
     command that re-ran it are the same string, and only the sequence tells
     them apart. */
  it("keeps every event in order", async () => {
    const stored = await run(
      Effect.gen(function* () {
        const tasks = yield* TaskRepository;
        const runs = yield* RunRepository;
        const trials = yield* TrialRepository;
        const journal = yield* EventRepository;

        const task = yield* tasks.insert({
          id: `ev-${Date.now()}`,
          name: "Events",
          organizationId,
          prompt: "fix it",
          setupCommand: null,
          verifyCommand: "bun test",
          workspace: "/tmp/w",
        });

        const created = yield* runs.insert({
          cellCount: 1,
          organizationId,
          startedBy: null,
          trialCount: 1,
        });

        const cell = yield* runs.insertCell({
          cellKey: cellKeyOf({
            harness: "codex",
            harnessVersion: "0.144.4",
            model: "gpt-5.2",
            provider: "daytona",
            taskId: task.id,
            taskVersion: "1",
          }),
          harness: "codex",
          harnessVersion: "0.144.4",
          model: "gpt-5.2",
          provider: "daytona",
          runInternalId: created.internalId,
          taskInternalId: task.internalId,
        });

        const trial = yield* trials.insert({
          cellInternalId: cell.internalId,
          ordinal: 1,
          provider: "daytona",
        });

        const written = yield* journal.append({
          events,
          trialInternalId: trial.internalId,
        });

        expect(written).toBe(events.length);

        return yield* journal.listByTrial(trial.internalId);
      })
    );

    expect(stored).toHaveLength(5);
    expect(stored.map((row) => row.kind)).toEqual([
      "Started",
      "Command",
      "FileChange",
      "Command",
      "Finished",
    ]);

    /* The exit codes are the point. A tool-call string cannot carry them, and
       recovering them after the fact is what the journal exists for. */
    const commands = stored.filter((row) => row.kind === "Command");
    expect(commands.map((row) => row.payload.exitCode as number)).toEqual([
      1, 0,
    ]);
  });

  it("writes nothing when there is nothing to write", async () => {
    const written = await run(
      Effect.gen(function* () {
        const journal = yield* EventRepository;
        return yield* journal.append({ events: [], trialInternalId: "unused" });
      })
    );

    expect(written).toBe(0);
  });
});
