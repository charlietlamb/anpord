import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Duration, Effect, Layer, Option, Redacted } from "effect";
import { CellKey } from "../../src/domain/cell";
import { EvalBaselinesLive } from "../../src/layer";
import { Baselines } from "../../src/services/baselines";
import { skipWithoutDatabase } from "../fixtures/database";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = EvalBaselinesLive.pipe(
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
const organizationId = `org_b_${suffix}`;
const key = CellKey.make(`bkey_${suffix}`);
const voidKey = CellKey.make(`bvoid_${suffix}`);

const run = <A, E>(effect: Effect.Effect<A, E, Baselines | Database>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<A, E>
  );

const seedCell = async (input: {
  readonly cellKey: string;
  readonly passing: number;
  readonly tag: string;
  readonly total: number;
  readonly voided?: number;
}) => {
  await run(
    Effect.gen(function* () {
      const db = yield* Database;

      yield* Effect.promise(async () => {
        await db.insert(evalRun).values({
          cellCount: 1,
          finishedAt: new Date(),
          id: `run_${input.tag}`,
          internalId: `runint_${input.tag}`,
          organizationId,
          status: "finished",
          trialCount: input.total,
        });

        await db.insert(evalCell).values({
          cellKey: input.cellKey,
          harness: "codex",
          harnessVersion: "0.144.4",
          internalId: `cellint_${input.tag}`,
          model: "gpt-5",
          prompt: "do the thing",
          provider: "daytona",
          runInternalId: `runint_${input.tag}`,
          status: "finished",
          taskInternalId: `taskint_${suffix}`,
        });

        const voided = input.voided ?? 0;

        await db.insert(evalTrial).values(
          Array.from({ length: input.total }, (_, index) => {
            const isVoid = index < voided;
            const passed = !isVoid && index - voided < input.passing;

            const statusOf = () => {
              if (isVoid) {
                return "void";
              }

              return passed ? "passed" : "failed";
            };

            return {
              cellInternalId: `cellint_${input.tag}`,
              commandCount: 10,
              exitCode: passed ? 0 : 1,
              finishedAt: new Date(),
              internalId: `trialint_${input.tag}_${index}`,
              modelMs: 100,
              ordinal: index + 1,
              passed: isVoid ? null : passed,
              provider: "daytona",
              sandboxMs: 50,
              status: statusOf(),
              voidFields: isVoid ? ["stdout"] : [],
            };
          })
        );
      });
    })
  );
};

describe.skipIf(skipWithoutDatabase())("Baselines", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;

        yield* Effect.promise(async () => {
          await db
            .insert(organization)
            .values({
              createdAt: new Date(),
              id: organizationId,
              name: "baseline test",
              slug: `bas-${suffix}`,
            })
            .onConflictDoNothing();

          await db.insert(evalTask).values({
            id: `task_${suffix}`,
            internalId: `taskint_${suffix}`,
            name: "baseline",
            organizationId,
            prompt: "p",
            verifyCommand: "true",
            workspace: "/tmp/x",
          });
        });
      })
    );

    await seedCell({
      cellKey: key,
      passing: 10,
      tag: `base${suffix}`,
      total: 10,
    });
    await seedCell({
      cellKey: key,
      passing: 4,
      tag: `worse${suffix}`,
      total: 10,
    });
    await seedCell({
      cellKey: voidKey,
      passing: 0,
      tag: `void${suffix}`,
      total: 5,
      voided: 5,
    });
  });

  it("accepts a cell's first scored reading as its baseline", async () => {
    const found = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        yield* baselines.promoteIfAbsent({
          cellInternalId: `cellint_base${suffix}`,
          cellKey: key,
          organizationId,
        });

        return yield* baselines.find(organizationId, key);
      })
    );

    expect(Option.isSome(found)).toBe(true);

    if (Option.isNone(found)) {
      return;
    }

    expect(found.value.distribution.passRate).toBe(1);
  });

  it("leaves an existing baseline alone", async () => {
    const found = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        yield* baselines.promoteIfAbsent({
          cellInternalId: `cellint_base${suffix}`,
          cellKey: key,
          organizationId,
        });

        yield* baselines.promoteIfAbsent({
          cellInternalId: `cellint_worse${suffix}`,
          cellKey: key,
          organizationId,
        });

        return yield* baselines.find(organizationId, key);
      })
    );

    expect(Option.isSome(found)).toBe(true);

    if (Option.isNone(found)) {
      return;
    }

    expect(found.value.cellInternalId).toBe(`cellint_base${suffix}`);
  });

  it("reports a later worse run as a regression", async () => {
    const comparisons = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        return yield* baselines.compareRun(
          organizationId,
          `run_worse${suffix}`
        );
      })
    );

    expect(comparisons).toHaveLength(1);

    const comparison = comparisons[0]?.comparison;

    expect(comparison && Option.isSome(comparison)).toBe(true);

    if (!comparison || Option.isNone(comparison)) {
      return;
    }

    expect(comparison.value.verdict).toBe("regressed");
    expect(comparison.value.delta).toBeCloseTo(-0.6);
  });

  it("stores no baseline for a cell with no scored trials", async () => {
    const found = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        yield* baselines.promoteIfAbsent({
          cellInternalId: `cellint_void${suffix}`,
          cellKey: voidKey,
          organizationId,
        });

        return yield* baselines.find(organizationId, voidKey);
      })
    );

    expect(Option.isNone(found)).toBe(true);
  });

  it("reads a cell's history from an unbranded key", async () => {
    const history = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        return yield* baselines.history({
          cellKey: String(key),
          limit: 10,
          organizationId,
        });
      })
    );

    expect(history.length).toBeGreaterThan(0);
    expect(history[0]?.distribution.scored).toBeGreaterThan(0);
  });

  it("keeps one organization's history out of another's", async () => {
    const history = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        return yield* baselines.history({
          cellKey: String(key),
          limit: 10,
          organizationId: `org_other_${suffix}`,
        });
      })
    );

    expect(history).toEqual([]);
  });

  it("yields no verdict for a cell with no baseline", async () => {
    const comparisons = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        return yield* baselines.compareRun(organizationId, `run_void${suffix}`);
      })
    );

    expect(comparisons).toHaveLength(1);
    expect(
      comparisons[0]?.comparison && Option.isNone(comparisons[0].comparison)
    ).toBe(true);
  });

  it("yields no verdict for a cell that is its own baseline", async () => {
    const comparisons = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        yield* baselines.promoteIfAbsent({
          cellInternalId: `cellint_base${suffix}`,
          cellKey: key,
          organizationId,
        });

        return yield* baselines.compareRun(organizationId, `run_base${suffix}`);
      })
    );

    expect(comparisons).toHaveLength(1);
    expect(
      comparisons[0]?.comparison && Option.isNone(comparisons[0].comparison)
    ).toBe(true);
  });
});
