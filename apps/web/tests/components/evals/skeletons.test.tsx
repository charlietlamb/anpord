import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialCallsSkeleton } from "../../../src/components/evals/trial-calls-skeleton";
import { TrialSkeleton } from "../../../src/components/evals/trial-skeleton";

test("the calls surface keeps its heading while its rows load", () => {
  expect(renderToStaticMarkup(<TrialCallsSkeleton />)).toContain("Calls");
});

test("the trial skeleton holds the page header while the trial loads", () => {
  expect(renderToStaticMarkup(<TrialSkeleton />)).toContain("Trial");
});
