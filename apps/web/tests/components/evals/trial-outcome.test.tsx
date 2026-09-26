import { expect, test } from "bun:test";
import type { EvalTrial } from "@anpord/schema/domain/evals";
import { renderToStaticMarkup } from "react-dom/server";
import { TRIALS } from "../../../src/components/dev/eval-fixtures";
import { TrialOutcome } from "../../../src/components/evals/trial-outcome";
import { trialVerdict } from "../../../src/lib/evals/trial-verdict";

const stopped = {
  ...TRIALS[0],
  commands: 0,
  exitCode: -1,
  failedCommands: 0,
  failure: "The agent ran past its time limit of 5m",
  status: "void",
  voidFields: [],
} as EvalTrial;

test("says why a trial that stopped early was not scored", () => {
  const html = renderToStaticMarkup(<TrialOutcome trial={stopped} />);

  expect(html).toContain("Not scored: The agent ran past its time limit of 5m");
});

test("names the reason on the trial's row", () => {
  expect(trialVerdict(stopped)).toBe(
    "Not scored: The agent ran past its time limit of 5m"
  );
});

test("keeps the field reasons for a trial that was scored void", () => {
  const html = renderToStaticMarkup(
    <TrialOutcome
      trial={{ ...stopped, failure: null, voidFields: ["stdout"] }}
    />
  );

  expect(html).toContain(
    "Not scored: nothing was written to stdout, so no evidence was produced"
  );
});
