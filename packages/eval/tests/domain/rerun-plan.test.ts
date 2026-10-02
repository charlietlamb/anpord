import { describe, expect, it } from "bun:test";
import type { EvalVariantResult } from "@sphynx/schema/domain/eval-read-models";
import {
  RerunFingerprint,
  type RerunIntent,
} from "@sphynx/schema/domain/eval-rerun";
import type {
  EvalDistribution,
  EvalSuite,
  EvalVariant,
} from "@sphynx/schema/domain/evals";
import { DateTime } from "effect";
import {
  fingerprintOf,
  passedCleanly,
  planRerun,
  type RerunCandidate,
} from "../../src/domain/rerun-plan";

const suite: EvalSuite = { id: "checkout", name: "Checkout" };
const VERSION = "ecav_one";

const distributionOf = (passed: number, scored: number): EvalDistribution => ({
  commandMax: 0,
  commandMedian: 0,
  commandMin: 0,
  deterministic: false,
  failed: scored - passed,
  passRate: scored === 0 ? 0 : passed / scored,
  passed,
  scored,
  trials: scored,
  voided: 0,
});

const variantOf = (overrides: Partial<EvalVariant>): EvalVariant => ({
  harness: "claude",
  id: "variant-a",
  model: "sonnet",
  profile: null,
  sandbox: "e2b",
  userModel: null,
  ...overrides,
});

const resultOf = (input: {
  readonly at?: number;
  readonly passed?: number;
  readonly scored?: number;
  readonly status?: EvalVariantResult["status"];
  readonly variant?: Partial<EvalVariant>;
}): EvalVariantResult => ({
  distribution: distributionOf(input.passed ?? 2, input.scored ?? 2),
  lastRunAt: DateTime.unsafeMake(input.at ?? 1000),
  lastRunId: "run-a",
  runs: 1,
  status: input.status ?? "finished",
  variant: variantOf(input.variant ?? {}),
});

const onVariant: RerunIntent = {
  scope: "everyCase",
  target: {
    harness: "claude",
    kind: "onVariant",
    model: "sonnet",
    sandbox: "e2b",
  },
  trials: 1,
};

const asBefore: RerunIntent = {
  scope: "everyCase",
  target: { kind: "asBefore" },
  trials: 1,
};

describe("passedCleanly", () => {
  it("is false for a run that scored nothing", () => {
    expect(passedCleanly(resultOf({ passed: 0, scored: 0 }))).toBe(false);
  });

  it("is true only when every scored trial passed", () => {
    expect(passedCleanly(resultOf({ passed: 2, scored: 2 }))).toBe(true);
    expect(passedCleanly(resultOf({ passed: 1, scored: 2 }))).toBe(false);
  });
});

describe("planRerun", () => {
  it("skips a case that has never run", () => {
    const plan = planRerun({
      candidates: [
        {
          caseId: "cold",
          caseName: "Cold",
          caseVersionInternalId: null,
          results: [],
        },
      ],
      intent: asBefore,
      suite,
    });

    expect(plan.slots).toEqual([]);
    expect(plan.skipped).toEqual([
      { caseId: "cold", caseName: "Cold", reason: "neverRun" },
    ]);
  });

  it("skips a passing case when only failures were asked for", () => {
    const plan = planRerun({
      candidates: [
        {
          caseId: "green",
          caseName: "Green",
          caseVersionInternalId: VERSION,
          results: [resultOf({})],
        },
      ],
      intent: { ...asBefore, scope: "onlyFailures" },
      suite,
    });

    expect(plan.slots).toEqual([]);
    expect(plan.skipped).toEqual([
      { caseId: "green", caseName: "Green", reason: "nothingFailed" },
    ]);
  });

  it("leaves a still running case alone when only failures were asked for", () => {
    const candidates: readonly RerunCandidate[] = [
      {
        caseId: "busy",
        caseName: "Busy",
        caseVersionInternalId: VERSION,
        results: [resultOf({ passed: 0, scored: 0, status: "running" })],
      },
    ];

    expect(
      planRerun({
        candidates,
        intent: { ...asBefore, scope: "onlyFailures" },
        suite,
      })
    ).toMatchObject({
      skipped: [{ caseId: "busy", caseName: "Busy", reason: "nothingFailed" }],
      slots: [],
    });

    expect(
      planRerun({
        candidates,
        intent: { ...onVariant, scope: "onlyFailures" },
        suite,
      }).slots
    ).toEqual([]);
  });

  it("takes a case whose newest run failed outright", () => {
    const plan = planRerun({
      candidates: [
        {
          caseId: "broke",
          caseName: "Broke",
          caseVersionInternalId: VERSION,
          results: [resultOf({ passed: 0, scored: 0, status: "failed" })],
        },
      ],
      intent: { ...asBefore, scope: "onlyFailures" },
      suite,
    });

    expect(plan.skipped).toEqual([]);
    expect(plan.slots).toEqual([
      {
        caseId: "broke",
        caseName: "Broke",
        variant: { kind: "existing", variant: variantOf({}) },
      },
    ]);
  });

  it("skips a local-only case when repeating the variants it ran on", () => {
    const plan = planRerun({
      candidates: [
        {
          caseId: "laptop",
          caseName: "Laptop",
          caseVersionInternalId: VERSION,
          results: [
            resultOf({ passed: 0, scored: 2, variant: { sandbox: "local" } }),
          ],
        },
      ],
      intent: { ...asBefore, scope: "onlyFailures" },
      suite,
    });

    expect(plan.slots).toEqual([]);
    expect(plan.skipped).toEqual([
      { caseId: "laptop", caseName: "Laptop", reason: "onlyLocal" },
    ]);
  });

  it("lifts that same local-only case onto a hosted variant", () => {
    const plan = planRerun({
      candidates: [
        {
          caseId: "laptop",
          caseName: "Laptop",
          caseVersionInternalId: VERSION,
          results: [resultOf({ variant: { sandbox: "local" } })],
        },
      ],
      intent: onVariant,
      suite,
    });

    expect(plan.skipped).toEqual([]);
    expect(plan.slots).toEqual([
      {
        caseId: "laptop",
        caseName: "Laptop",
        variant: {
          harness: "claude",
          kind: "fresh",
          model: "sonnet",
          sandbox: "e2b",
        },
      },
    ]);
  });

  it("reuses a variant the case already holds", () => {
    const plan = planRerun({
      candidates: [
        {
          caseId: "reuse",
          caseName: "Reuse",
          caseVersionInternalId: VERSION,
          results: [resultOf({})],
        },
      ],
      intent: onVariant,
      suite,
    });

    expect(plan.slots).toEqual([
      {
        caseId: "reuse",
        caseName: "Reuse",
        variant: { kind: "existing", variant: variantOf({}) },
      },
    ]);
  });

  it("collapses two variants of one case into one slot", () => {
    const plan = planRerun({
      candidates: [
        {
          caseId: "pair",
          caseName: "Pair",
          caseVersionInternalId: VERSION,
          results: [
            resultOf({}),
            resultOf({ variant: { id: "variant-b", model: "opus" } }),
          ],
        },
      ],
      intent: onVariant,
      suite,
    });

    expect(plan.slots.length).toBe(1);
    expect(plan.slots[0]?.variant).toEqual({
      kind: "existing",
      variant: variantOf({}),
    });
  });

  it("truncates whole cases once the batch limit is reached", () => {
    const candidates: RerunCandidate[] = [1, 2, 3, 4, 5, 6].map((index) => ({
      caseId: `case-${index}`,
      caseName: `Case ${index}`,
      caseVersionInternalId: VERSION,
      results: [
        resultOf({ at: 7000 - index }),
        resultOf({ at: 7000 - index, variant: { id: `variant-${index}b` } }),
      ],
    }));

    const plan = planRerun({
      candidates,
      intent: { ...asBefore, trials: 10 },
      suite,
    });

    expect(plan.slots.length).toBe(10);
    expect(plan.slots.map((slot) => slot.caseId)).toEqual([
      "case-1",
      "case-1",
      "case-2",
      "case-2",
      "case-3",
      "case-3",
      "case-4",
      "case-4",
      "case-5",
      "case-5",
    ]);
    expect(plan.skipped).toEqual([
      { caseId: "case-6", caseName: "Case 6", reason: "overBatchLimit" },
    ]);
  });
});

describe("the plan fingerprint", () => {
  const candidates: RerunCandidate[] = [
    {
      caseId: "reuse",
      caseName: "Reuse",
      caseVersionInternalId: VERSION,
      results: [resultOf({})],
    },
  ];
  const versions = new Map([["reuse", VERSION]]);

  it("names the slots it stands for", () => {
    expect(
      fingerprintOf(
        [
          {
            caseId: "reuse",
            caseName: "Reuse",
            variant: { kind: "existing", variant: variantOf({}) },
          },
        ],
        1,
        versions
      )
    ).toBe(RerunFingerprint.make("be02d2dc10f9cdea"));
  });

  it("is the one the plan carries", () => {
    expect(planRerun({ candidates, intent: asBefore, suite }).fingerprint).toBe(
      RerunFingerprint.make("be02d2dc10f9cdea")
    );
  });

  it("holds while the slots hold", () => {
    expect(planRerun({ candidates, intent: asBefore, suite }).fingerprint).toBe(
      planRerun({ candidates, intent: asBefore, suite }).fingerprint
    );
  });

  it("changes when a slot changes", () => {
    const moved = planRerun({
      candidates: [
        {
          caseId: "reuse",
          caseName: "Reuse",
          caseVersionInternalId: VERSION,
          results: [resultOf({ variant: { id: "variant-b" } })],
        },
      ],
      intent: asBefore,
      suite,
    });

    expect(moved.fingerprint).not.toBe(
      planRerun({ candidates, intent: asBefore, suite }).fingerprint
    );
  });

  it("changes when the case behind a slot moved to a new version", () => {
    const edited = planRerun({
      candidates: [
        {
          caseId: "reuse",
          caseName: "Reuse",
          caseVersionInternalId: "ecav_two",
          results: [resultOf({})],
        },
      ],
      intent: asBefore,
      suite,
    });

    expect(edited.slots).toEqual(
      planRerun({ candidates, intent: asBefore, suite }).slots
    );
    expect(edited.fingerprint).toBe(RerunFingerprint.make("cf7dcf30e5c4d191"));
  });

  it("changes when the trial count changes", () => {
    expect(
      planRerun({ candidates, intent: { ...asBefore, trials: 2 }, suite })
        .fingerprint
    ).not.toBe(planRerun({ candidates, intent: asBefore, suite }).fingerprint);
  });
});
