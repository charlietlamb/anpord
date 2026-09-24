import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialSkeleton } from "../../../src/components/evals/trial-skeleton";

test("the trial skeleton holds the page header while the trial loads", () => {
  expect(renderToStaticMarkup(<TrialSkeleton />)).toContain("Trial");
});
