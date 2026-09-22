import { expect, test } from "bun:test";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { renderToStaticMarkup } from "react-dom/server";
import { CellSetupSkeleton } from "../../../src/components/evals/cell-setup-skeleton";
import { TrialCallsSkeleton } from "../../../src/components/evals/trial-calls-skeleton";
import { TrialSkeleton } from "../../../src/components/evals/trial-skeleton";
import { ValidationInspectorSkeleton } from "../../../src/components/evals/validation-inspector-skeleton";

test("each surface keeps its own heading while its content loads", () => {
  expect(renderToStaticMarkup(<TrialCallsSkeleton />)).toContain("Calls");
  expect(renderToStaticMarkup(<ValidationInspectorSkeleton />)).toContain(
    "Validation"
  );
  expect(renderToStaticMarkup(<CellSetupSkeleton />)).toContain("Prompt");
});

test("the surface names itself while its rows load", () => {
  const html = renderToStaticMarkup(<ValidationInspectorSkeleton />);
  expect(html).toContain("Validation");
});

test("the trial skeleton shows the ordinal the route already knows", () => {
  expect(
    renderToStaticMarkup(
      <NuqsTestingAdapter>
        <TrialSkeleton ordinal="7" />
      </NuqsTestingAdapter>
    )
  ).toContain("7");
});

test("the trial skeleton composes one skeleton per surface", () => {
  const html = renderToStaticMarkup(
    <NuqsTestingAdapter>
      <TrialSkeleton ordinal="1" />
    </NuqsTestingAdapter>
  );
  expect(html).toContain("Trajectory");
  expect(html).toContain("Calls");
  expect(html).toContain("Validation");
  expect(html).toContain("Setup");
});
