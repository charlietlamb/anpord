import { describe, expect, test } from "bun:test";
import { Effect, Option, Redacted } from "effect";
import type { CredentialResolverShape } from "../../src/credentials/connections";
import { caseFrom, rebuildRun, taskFrom } from "../../src/grid/from-stored";
import type { GridRunShape, ResumeGrid } from "../../src/grid/run";
import type { CellTask, RunQueryShape } from "../../src/repositories/run-query";

const cell = (over: Partial<CellTask["cell"]> = {}, name = "a") =>
  ({
    cell: {
      harness: "codex",
      harnessCredentialConnectionId: "conn",
      harnessVersion: "1",
      model: "gpt-5.6-sol",
      provider: "daytona",
      runInternalId: "run-internal",
      sandboxCredentialConnectionId: null,
      taskInternalId: `internal-${name}`,
      ...over,
    },
    identity: `id-${name}`,
    name,
    prepareName: null,
    prepareSource: null,
    prompt: "{{task}}",
    source: { kind: "empty" },
    validatorName: null,
    validatorSource: null,
    verifyCommand: "true",
  }) as unknown as CellTask;

const asked: string[] = [];

/* Every stored cell carries a setup -- the prompt, the repository, the names
   of its validator and prepare -- so a cell that has done nothing still has
   one. Only a trial says work began. */
const trialWith = (status: string) => Option.some({ outcome: { status } });

const liveCell = (working: boolean) => ({
  live: new Map(),
  setup: Option.some({ prompt: "{{task}}" }),
  trials: working ? [trialWith("running")] : [Option.none()],
});

const services = (cells: readonly CellTask[], working = false) => ({
  credentials: {
    resolve: () =>
      Effect.succeed(Redacted.make({ revision: 1, values: {} }) as never),
    resolveBound: ({ connectionId }: { connectionId: string }) =>
      Effect.sync(() => {
        asked.push(connectionId);

        return Redacted.make({ revision: 1, values: {} }) as never;
      }),
  } as unknown as CredentialResolverShape,
  grid: {
    get: () => Effect.succeed(Option.some({ cells: [liveCell(working)] })),
  } as unknown as GridRunShape,
  query: {
    findRunTasks: () => Effect.succeed(cells),
  } as unknown as RunQueryShape,
});

const BOUND = { bound: true } as const;
const AS_ACTOR = {
  actor: { organizationId: "org" },
  legacyHarnessAuth: "legacy",
} as never;

const rebuilding = (
  cells: readonly CellTask[],
  source: Parameters<typeof rebuildRun>[1]["source"] = BOUND,
  working = false
) =>
  Effect.runPromise(
    rebuildRun(services(cells, working), {
      organizationId: "org",
      runId: "run_1",
      source,
    }).pipe(Effect.either) as never
  ) as Promise<{ _tag: string; right?: ResumeGrid }>;

describe("reading a case back from what was stored", () => {
  test("pairs a prepare only when it has both halves", () => {
    expect(caseFrom(cell()).prepare).toBeNull();
  });

  test("keeps the identity the cell was registered under", () => {
    expect(caseFrom(cell()).identity).toBe("id-a");
  });

  test("carries the connections a caller will resolve for itself", () => {
    expect(taskFrom(cell()).credentials).toEqual({
      harnessConnectionId: "conn",
      sandboxConnectionId: undefined,
    });
  });
});

describe("rebuilding the grid a run was", () => {
  const square = [
    cell({ model: "gpt-5" }, "a"),
    cell({ model: "gpt-5" }, "b"),
    cell({ model: "claude" }, "a"),
    cell({ model: "claude" }, "b"),
  ];

  test("runs the cells it stored, rather than their square", async () => {
    const outcome = await rebuilding(square);

    expect(outcome.right?.input.cases).toHaveLength(2);
    expect(outcome.right?.input.tasks).toHaveLength(2);
  });

  test("names each case once, so the grid can index them", async () => {
    const outcome = await rebuilding(square);

    expect(outcome.right?.registered.map((row) => row.id)).toEqual([
      "id-a",
      "id-b",
    ]);
  });

  test("continues the run it was given rather than starting another", async () => {
    const outcome = await rebuilding([cell()]);

    expect(outcome.right?.created).toEqual({
      id: "run_1",
      internalId: "run-internal",
    });
  });
});

describe("where the credentials come from", () => {
  /* The whole reason the source is a parameter: a worker has nobody to check
     against, so it reads the connection the run already recorded. */
  test("a worker asks for the connection the cell recorded", async () => {
    asked.length = 0;

    await rebuilding([cell({ harnessCredentialConnectionId: "conn-7" })]);

    expect(asked).toContain("conn-7");
  });

  test("a worker refuses a cell that recorded none, rather than guessing", async () => {
    const outcome = await rebuilding([
      cell({ harnessCredentialConnectionId: null }),
    ]);

    expect(outcome._tag).toBe("Left");
  });

  test("a person resolves against themselves instead", async () => {
    asked.length = 0;

    const outcome = await rebuilding([cell()], AS_ACTOR);

    expect(outcome._tag).toBe("Right");
    expect(asked).toHaveLength(0);
  });
});

describe("a run that should not be continued", () => {
  test("is refused while something is already working on it", async () => {
    const outcome = await rebuilding([cell()], BOUND, true);

    expect(outcome._tag).toBe("Left");
  });

  test("is refused when it has no cells", async () => {
    const outcome = await rebuilding([]);

    expect(outcome._tag).toBe("Left");
  });
});

describe("a run that has only just been recorded", () => {
  /* start marks a run running and then hands it to a worker, so the worker
     always arrives at one already marked running. Refusing that would refuse
     every dispatched run, which is what a status check did. */
  test("is continued, not refused for being marked running", async () => {
    const outcome = await rebuilding([cell()], BOUND, false);

    expect(outcome._tag).toBe("Right");
    expect(outcome.right?.input.cases).toHaveLength(1);
  });
});

describe("a run whose earlier attempt was abandoned", () => {
  /* The sweep voids a trial whose process died, which is exactly the run a
     resume is for. Counting that trial as work under way meant a run could be
     picked up once and never again. */
  test("is continued, not refused for the trial the sweep voided", async () => {
    const outcome = (await Effect.runPromise(
      rebuildRun(
        {
          ...services([cell()], false),
          grid: {
            get: () =>
              Effect.succeed(
                Option.some({
                  cells: [
                    {
                      live: new Map(),
                      setup: Option.some({}),
                      trials: [trialWith("void")],
                    },
                  ],
                })
              ),
          } as unknown as GridRunShape,
        },
        { organizationId: "org", runId: "run_1", source: BOUND }
      ).pipe(Effect.either) as never
    )) as { _tag: string };

    expect(outcome._tag).toBe("Right");
  });
});
