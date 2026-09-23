import { expect, test } from "bun:test";
import {
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import type { EvalSetup, EvalTrial } from "@anpord/schema/domain/evals";
import { renderToStaticMarkup } from "react-dom/server";
import { TRIALS } from "../../../src/components/dev/eval-fixtures";
import { TrialChecks } from "../../../src/components/evals/trial-checks";
import { ValidationDetail } from "../../../src/components/evals/validation-detail";

const capture = validationCapture();

const SETUP: EvalSetup = {
  prepareName: null,
  prompt: "Fix it",
  repoRef: null,
  repoUrl: null,
  validatorFiles: [
    { content: "source must start hidden", path: "secret-source.ts" },
  ],
  validatorName: "validate",
  verifyCommand: null,
  workspace: "/tmp/anpord-task",
};

const errored = {
  ...validationExecution(
    { id: "code:0", index: 0, kind: "code", name: "checkFixture" },
    1000
  ),
  error: capture("<script>missing</script>", "text"),
  message: "Fixture could not be read",
  output: capture({ passed: false }),
  status: "error" as const,
};

const skipped = {
  ...validationExecution(
    { id: "code:1", index: 1, kind: "code", name: "checkAnswer" },
    null
  ),
  message: "An earlier validator did not pass",
};

const trialWith = (validations: EvalTrial["validations"]) =>
  ({ ...TRIALS[0], validations }) as EvalTrial;

test("lists each check with its status, and keeps the source out of view", () => {
  const html = renderToStaticMarkup(
    <TrialChecks setup={SETUP} trial={trialWith([errored, skipped])} />
  );

  expect(html).toContain("checkFixture");
  expect(html).toContain("checkAnswer");
  expect(html).toContain("Errored");
  expect(html).toContain("Skipped");
  expect(html).toContain("0/2 passed");
  expect(html).toContain("Source");
  expect(html).not.toContain("source must start hidden");
});

test("does not fabricate evidence for trials that recorded none", () => {
  expect(
    renderToStaticMarkup(<TrialChecks setup={SETUP} trial={trialWith([])} />)
  ).toContain("No check results were recorded");
});

test.each([
  "code",
  "judge",
  "command",
] as const)("labels the %s icon before the check name", (kind) => {
  const html = renderToStaticMarkup(
    <TrialChecks
      setup={SETUP}
      trial={trialWith([
        validationExecution(
          { id: `${kind}:0`, index: 0, kind, name: "check" },
          null
        ),
      ])}
    />
  );

  expect(html).toContain(`aria-label="${kind}"`);
  expect(html.indexOf(`aria-label="${kind}"`)).toBeLessThan(
    html.indexOf(">check</span>")
  );
});

test("the detail escapes the error it shows", () => {
  const html = renderToStaticMarkup(<ValidationDetail validation={errored} />);

  expect(html).toContain("&lt;script&gt;missing&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).toContain("Execution");
});

test("the detail keeps the return once, with the reads behind Evidence", () => {
  const html = renderToStaticMarkup(
    <ValidationDetail
      validation={{
        ...validationExecution(
          { id: "code:0", index: 0, kind: "code", name: "check" },
          1000
        ),
        calls: [
          {
            durationMs: 3,
            error: null,
            index: 0,
            input: capture(["unique argument"]),
            method: "answer",
            output: capture("unique answer"),
            startedAt: 1000,
          },
        ],
        message: "Check passed",
        output: capture("unique return", "text"),
        status: "passed",
      }}
    />
  );

  expect(html.match(/unique return/g)).toHaveLength(1);
  expect(html).toContain("Evidence");
});
