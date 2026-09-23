import { describe, expect, it } from "bun:test";
import { connectionNotFound } from "@anpord/eval/credentials/errors";
import { CredentialResolver } from "@anpord/eval/credentials/resolver";
import { RunQuery } from "@anpord/eval/repositories/run-query";
import {
  MAX_ORGANIZATION_RUNS_IN_FLIGHT,
  MAX_RUN_TRIALS,
} from "@anpord/schema/domain/eval-quota";
import { Effect, Layer, Option } from "effect";
import { admitStart } from "../../src/routes/internal/evals/start-admission";

const unconnected = Layer.succeed(CredentialResolver, {
  persist: () => Effect.void,
  resolve: () => Effect.fail(connectionNotFound()),
  resolveBound: () => Effect.fail(connectionNotFound()),
} as never);

const task = (model: string) => ({
  harness: "codex",
  model,
  provider: "upstash",
});

const start = (input: {
  readonly cases: number;
  readonly variants: readonly ReturnType<typeof task>[];
  readonly trials: number;
  readonly user?: { readonly kind: string };
}) => ({
  cases: Array.from({ length: input.cases }, () => ({ user: input.user })),
  variants: input.variants,
  trials: input.trials,
});

/** Only `countRunning` is reached; the rest stand in so the tag can be
 * provided at all. */
const withRunning = (running: number) =>
  Layer.succeed(
    RunQuery,
    RunQuery.of({
      countRunning: () => Effect.succeed(running),
      countRuns: () => Effect.succeed(running),
      findCase: () => Effect.succeed(Option.none()),
      findRunAddresses: () => Effect.succeed([]),
      findTrial: () => Effect.succeed(Option.none()),
      findCaseHistory: () => Effect.succeed([]),
      findCaseTasks: () => Effect.succeed([]),
      findCaseVariants: () => Effect.succeed([]),
      findCellHistory: () => Effect.succeed([]),
      findCellTask: () => Effect.succeed(Option.none()),
      findRun: () => Effect.succeed(Option.none()),
      findRunTasks: () => Effect.succeed([]),
      hydrateRuns: () => Effect.succeed([]),
      listCases: () => Effect.succeed({ cases: [], next: null }),

      listRuns: () => Effect.succeed([]),

      listTags: () => Effect.succeed([]),
      readTail: () => Effect.succeedNone,
    })
  );

/** The refusal's message, or null where the start was admitted. */
const refusalOf = (payload: ReturnType<typeof start>, running = 0) =>
  Effect.runSync(
    admitStart("org_1", payload).pipe(
      Effect.provide(withRunning(running)),
      Effect.provide(unconnected),
      Effect.map(() => null),
      Effect.catchAll((refusal) => Effect.succeed(refusal.message))
    )
  );

describe("what a start is admitted for", () => {
  it("accepts a grid inside every limit", () => {
    expect(
      refusalOf(start({ cases: 2, variants: [task("a")], trials: 3 }))
    ).toBe(null);
  });

  /* Cells run eight at a time and each cell runs up to ten trials, so an
     unbounded start can want scores of simultaneous VMs. Refused before
     `grid.start`, so nothing is opened and no run row is written. */
  it("refuses a start asking for more trials than a run may hold", () => {
    const refusal = refusalOf(
      start({
        cases: MAX_RUN_TRIALS,
        variants: [task("a"), task("b")],
        trials: 1,
      })
    );

    expect(refusal).toContain(String(MAX_RUN_TRIALS));
    expect(refusal).toContain(String(MAX_RUN_TRIALS * 2));
  });

  it("accepts a start sitting exactly on the trial cap", () => {
    expect(
      refusalOf(
        start({ cases: MAX_RUN_TRIALS, variants: [task("a")], trials: 1 })
      )
    ).toBe(null);
  });

  /* The trial cap bounds one run; nothing bounded the number of runs, and
     nothing about starting one is slow enough to make starting many hard. */
  it("refuses a start when the organization already has its runs going", () => {
    expect(
      refusalOf(
        start({ cases: 1, variants: [task("a")], trials: 1 }),
        MAX_ORGANIZATION_RUNS_IN_FLIGHT
      )
    ).toContain(String(MAX_ORGANIZATION_RUNS_IN_FLIGHT));
  });

  it("admits again once one of those runs has settled", () => {
    expect(
      refusalOf(
        start({ cases: 1, variants: [task("a")], trials: 1 }),
        MAX_ORGANIZATION_RUNS_IN_FLIGHT - 1
      )
    ).toBe(null);
  });

  it("still refuses two tasks naming the same column", () => {
    expect(
      refusalOf(
        start({ cases: 1, variants: [task("a"), task("a")], trials: 1 })
      )
    ).toContain("unique");
  });

  /* A conflict rather than a bad request: the payload is correct, and what
     stops the run is the organization not having connected a user yet. */
  it("refuses a human nobody is configured to play", () => {
    const refusal = Effect.runSync(
      admitStart(
        "org_1",
        start({
          cases: 1,
          variants: [task("a")],
          trials: 1,
          user: { kind: "simulated" },
        })
      ).pipe(
        Effect.provide(withRunning(0)),
        Effect.provide(unconnected),
        Effect.map(() => null),
        Effect.catchAll((found) => Effect.succeed(found))
      )
    );

    expect(refusal?._tag).toBe("Conflict");
    expect(refusal?.message).toContain("needs a model to play them");
  });

  it("admits a scripted user with no credential", () => {
    expect(
      refusalOf(
        start({
          cases: 1,
          variants: [task("a")],
          trials: 1,
          user: { kind: "scripted" },
        })
      )
    ).toBe(null);
  });
});
