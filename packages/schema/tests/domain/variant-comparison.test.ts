import { describe, expect, it } from "bun:test";
import type { EvalCell, EvalTask, EvalTrial } from "../../src/domain/evals";
import { leadersOn, variantsOf } from "../../src/domain/variant-comparison";

const task = (model: string): EvalTask => ({
  harness: "codex",
  harnessVersion: "1",
  model,
  provider: "daytona",
});

const trial = (over: Partial<EvalTrial>): EvalTrial =>
  ({
    commands: 2,
    exitCode: 0,
    failedCommands: 0,
    filesChanged: [],
    modelMs: 100,
    ordinal: 1,
    passed: true,
    sandboxId: null,
    sandboxMs: 10,
    status: "passed",
    timed: true,
    trajectory: [],
    usage: null,
    voidFields: [],
    ...over,
  }) as EvalTrial;

const cell = (taskIndex: number, trials: readonly EvalTrial[]): EvalCell =>
  ({
    caseName: "c",
    cellKey: `k${taskIndex}`,
    comparison: null,
    distribution: {
      commandMax: 0,
      commandMedian: 0,
      commandMin: 0,
      deterministic: true,
      failed: trials.filter((t) => !t.passed).length,
      passRate: 0,
      passed: trials.filter((t) => t.passed).length,
      scored: trials.length,
      trials: trials.length,
      voided: 0,
    },
    internalId: null,
    setup: null,
    status: "finished",
    taskIndex,
    trials,
  }) as EvalCell;

describe("reading a run as variants", () => {
  it("gives one row per variant that ran", () => {
    const variants = variantsOf({
      cells: [cell(0, [trial({})]), cell(1, [trial({})])],
      tasks: [task("a"), task("b")],
    });

    expect(variants.map((v) => v.task.model)).toEqual(["a", "b"]);
  });

  it("leaves out a variant with no cells", () => {
    const variants = variantsOf({
      cells: [cell(0, [trial({})])],
      tasks: [task("a"), task("b")],
    });

    expect(variants).toHaveLength(1);
  });

  it("reads the pass rate across every case", () => {
    const variants = variantsOf({
      cells: [cell(0, [trial({}), trial({ passed: false, status: "failed" })])],
      tasks: [task("a")],
    });

    expect(variants[0]?.passRate).toBe(0.5);
  });

  /* A voided trial never tested anything, so counting its zero would make a
     variant that failed to start look like the fastest one. */
  it("ignores a voided trial when timing a variant", () => {
    const variants = variantsOf({
      cells: [
        cell(0, [
          trial({ modelMs: 900 }),
          trial({ modelMs: 0, status: "void" }),
        ]),
      ],
      tasks: [task("a")],
    });

    expect(variants[0]?.modelMs).toBe(900);
  });
});

describe("naming the leader", () => {
  const two = variantsOf({
    cells: [
      cell(0, [trial({ modelMs: 100 })]),
      cell(1, [trial({ modelMs: 300, passed: false, status: "failed" })]),
    ],
    tasks: [task("fast"), task("slow")],
  });

  it("takes the highest pass rate", () => {
    expect(leadersOn(two, "passRate")).toEqual(new Set([0]));
  });

  it("takes the lowest duration", () => {
    expect(leadersOn(two, "modelMs")).toEqual(new Set([0]));
  });

  it("names both when they tie", () => {
    const tied = variantsOf({
      cells: [
        cell(0, [trial({ modelMs: 100 })]),
        cell(1, [trial({ modelMs: 100 })]),
      ],
      tasks: [task("a"), task("b")],
    });

    expect(leadersOn(tied, "modelMs")).toEqual(new Set([0, 1]));
  });

  /* A race of one has no result, and a rosette beside the only runner says
     something the numbers do not. */
  it("names nobody when only one variant ran", () => {
    const alone = variantsOf({
      cells: [cell(0, [trial({})])],
      tasks: [task("a")],
    });

    expect(leadersOn(alone, "passRate").size).toBe(0);
  });
});
