import { expect, test } from "bun:test";
import type { EvalComparison } from "@anpord/schema/domain/evals";
import { renderToStaticMarkup } from "react-dom/server";
import { CELL } from "@/components/dev/eval-fixtures";
import { CellVerdictNote } from "./cell-verdict-note";

const comparison: EvalComparison = {
  baselineHarnessVersion: "1.0",
  candidateHarnessVersion: "1.0",
  baselineProfileVersion: "e45ae9d4",
  candidateProfileVersion: "fc073945",
  baselinePassRate: 1,
  candidatePassRate: 1,
  delta: 0,
  determinismLost: false,
  verdict: "unchanged",
  reason: null,
};

const renderNote = (value: EvalComparison | null) =>
  renderToStaticMarkup(
    <CellVerdictNote cell={{ ...CELL, comparison: value }} />
  );

test.each([
  ["e45ae9d4", "fc073945"],
  ["same", "same"],
  [null, null],
  [null, "new"],
  ["old", null],
] as const)("does not display profile versions: %s → %s", (baseline, candidate) => {
  expect(
    renderNote({
      ...comparison,
      baselineProfileVersion: baseline,
      candidateProfileVersion: candidate,
    })
  ).toBe("");
});

test("does not show a setup change without a comparison", () => {
  expect(renderNote(null)).toBe("");
});

test("preserves actionable comparison notes without a setup indicator", () => {
  const html = renderNote({
    ...comparison,
    candidateHarnessVersion: "1.1",
    determinismLost: true,
  });
  expect(html).toContain("no longer deterministic · harness 1.0 → 1.1</p>");
  expect(html).not.toContain("Setup changed");
  expect(html).not.toContain("e45ae9d4");
  expect(html).not.toContain("fc073945");
});
