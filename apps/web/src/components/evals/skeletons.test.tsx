import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CellSetupSkeleton } from "./cell-setup-skeleton";
import { TrialCallsSkeleton } from "./trial-calls-skeleton";
import { TrialSkeleton } from "./trial-skeleton";
import { ValidationInspectorSkeleton } from "./validation-inspector-skeleton";

test("each surface keeps its own heading while its content loads", () => {
  expect(renderToStaticMarkup(<TrialCallsSkeleton />)).toContain("Calls");
  expect(renderToStaticMarkup(<ValidationInspectorSkeleton />)).toContain(
    "Validation"
  );
  expect(renderToStaticMarkup(<CellSetupSkeleton />)).toContain("Prompt");
});

test("static tabs render immediately rather than as placeholders", () => {
  const html = renderToStaticMarkup(<ValidationInspectorSkeleton />);
  expect(html).toContain("Results");
  expect(html).toContain("Source");
});

test("the trial skeleton shows the ordinal the route already knows", () => {
  expect(renderToStaticMarkup(<TrialSkeleton ordinal="7" />)).toContain("7");
});

test("the trial skeleton composes one skeleton per surface", () => {
  const html = renderToStaticMarkup(<TrialSkeleton ordinal="1" />);
  expect(html).toContain("Trajectory");
  expect(html).toContain("Calls");
  expect(html).toContain("Validation");
  expect(html).toContain("Prompt");
});
