import { expect, test } from "bun:test";
import type { RerunPlan } from "@anpord/schema/domain/eval-rerun";
import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { renderToStaticMarkup } from "react-dom/server";
import { RERUN_PLAN } from "../../../src/components/dev/rerun-fixtures";
import { RerunPreview } from "../../../src/components/evals/rerun-preview";

const render = (plan: RerunPlan) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <RerunPreview plan={plan} />
    </TooltipProvider>
  );

test("counts the runs, the cases and the trials a re-run would start", () => {
  expect(render(RERUN_PLAN)).toContain(
    "6 runs across 4 cases, 12 trials in all"
  );
});

test("marks the variant a re-run would add to a case", () => {
  expect(render(RERUN_PLAN)).toContain("New variant");
});

test("says in plain words why each case is left out", () => {
  const html = render(RERUN_PLAN);

  expect(html).toContain("1 case left out, nothing failed");
  expect(html).toContain(
    "1 case left out, never run, so there is nothing to repeat"
  );
  expect(html).toContain("1 case left out, only ever ran on your own machine");
  expect(html).toContain("1 case left out, over what one batch can hold");
});

test("a plan with nothing to run says so instead of an empty table", () => {
  const html = render({ ...RERUN_PLAN, skipped: [], slots: [] });

  expect(html).toContain("Nothing in this suite matches what you picked.");
  expect(html).not.toContain("Cases this re-run would start");
});
