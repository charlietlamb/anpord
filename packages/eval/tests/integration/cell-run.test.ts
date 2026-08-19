import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { eq } from "drizzle-orm";
import { Duration, Effect, Layer, Redacted } from "effect";
import { EvalLayer, EvalSandboxLive } from "../../src/layer";
import { EventRepository } from "../../src/repositories/event-repository";
import { TaskRepository } from "../../src/repositories/task-repository";
import { TrialRepository } from "../../src/repositories/trial-repository";
import { CellRun } from "../../src/services/cell-run";
import {
  AGENT_PROMPT,
  brokenSource,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";
import {
  codexCredentials,
  hasCodex,
  hasDatabase,
  hasDaytona,
} from "../fixtures/credentials";

const URL = process.env.EVAL_TEST_DATABASE_URL;
const READY = hasDaytona && hasCodex && hasDatabase;

const TestLayer = EvalLayer.pipe(
  Layer.provideMerge(EvalSandboxLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 4,
      statementTimeout: Duration.seconds(60),
      url: Redacted.make(URL ?? ""),
    })
  )
);

const organizationId = `org_cell_${Date.now()}`;

type Tags =
  | CellRun
  | Database
  | EventRepository
  | TaskRepository
  | TrialRepository;

const run = <A, E>(effect: Effect.Effect<A, E, Tags>) =>
  Effect.runPromise(
    Effect.provide(effect, TestLayer) as Effect.Effect<A, E, never>
  );

describe.if(READY)("a cell run recorded end to end", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;
        yield* Effect.promise(() =>
          db.insert(organization).values({
            createdAt: new Date(),
            id: organizationId,
            name: "cell",
            slug: organizationId,
          })
        );
      })
    );
  });

  /* The whole system in one test: a registered task, an agent that fixes it in
     a sandbox, a verdict from our own verifier, and a journal that survives
     the sandbox it came from. */
  it("runs an agent against a stored task and records the journal", async () => {
    const found = await run(
      Effect.gen(function* () {
        const tasks = yield* TaskRepository;
        const cells = yield* CellRun;
        const trials = yield* TrialRepository;
        const journal = yield* EventRepository;

        const task = yield* tasks.insert({
          id: `fix-total-${Date.now()}`,
          name: "Fix total",
          organizationId,
          prompt: AGENT_PROMPT,
          setupCommand: null,
          verifyCommand: VERIFY_COMMAND,
          workspace: "/tmp/anpord-task",
        });

        const result = yield* cells.run({
          agent: {
            autoStopMinutes: 15,
            credentials: codexCredentials ?? Redacted.make(""),
            harness: "codex",
            harnessVersion: "0.144.4",
            home: "/home/daytona",
            model: "gpt-5.2",
            prompt: AGENT_PROMPT,
            provider: "daytona",
          },
          concurrency: 2,
          source: brokenSource,
          organizationId,
          startedBy: null,
          taskId: task.id,
          trials: 2,
        });

        const db = yield* Database;
        const cellRows = yield* Effect.promise(() =>
          db.select().from(evalCell).where(eq(evalCell.cellKey, result.cellKey))
        );

        const cellInternalId = cellRows.at(0)?.internalId ?? "";
        const stored = yield* trials.listByCell(cellInternalId);
        const events = yield* journal.listByTrial(
          stored.at(0)?.internalId ?? ""
        );

        return { events, result, stored };
      })
    );

    expect(found.result.distribution.trials).toBe(2);
    expect(found.result.distribution.voided).toBe(0);
    expect(found.result.runId).toStartWith("run_");
    expect(found.result.cellKey).toHaveLength(32);

    /* Both trials are rows, not just a summary: a report reads them back
         rather than trusting a number held in memory. */
    expect(found.stored).toHaveLength(2);
    for (const trial of found.stored) {
      expect(trial.sandboxId).toBeTruthy();
      expect(trial.status).not.toBe("queued");
    }

    /* The journal survives the sandbox that produced it, which is what makes
         an exit code recoverable after the box is gone. */
    expect(found.events.length).toBeGreaterThan(0);
    expect(found.events.some((event) => event.kind === "Command")).toBe(true);
  }, 1_800_000);
});
