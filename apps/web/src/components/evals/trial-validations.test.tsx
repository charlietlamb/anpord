import { expect, test } from "bun:test";
import {
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialValidations } from "./trial-validations";

test("shows each validator, exact return, and escaped error", () => {
  const capture = validationCapture();
  const html = renderToStaticMarkup(
    <TrialValidations
      validations={[
        {
          ...validationExecution(
            { id: "code:0", index: 0, name: "checkFixture", kind: "code" },
            1000
          ),
          status: "error",
          message: "Fixture could not be read",
          error: capture("<script>missing</script>", "text"),
          output: capture({ passed: false }),
        },
        {
          ...validationExecution(
            { id: "code:1", index: 1, name: "checkAnswer", kind: "code" },
            null
          ),
          message: "An earlier validator did not pass",
        },
      ]}
    />
  );
  expect(html).toContain("checkFixture");
  expect(html).toContain("checkAnswer");
  expect(html).toContain("skipped");
  expect(html).toContain("&lt;script&gt;missing&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).toContain("false");
  expect(html).not.toContain("Read by validator");
  expect(html).toContain("Execution details");
  expect(html).not.toContain("divide-");
  expect(html).not.toContain("Read result");
});

test("does not fabricate evidence for historical trials", () => {
  expect(renderToStaticMarkup(<TrialValidations />)).toContain(
    "Execution evidence was not recorded"
  );
});

test.each([
  "code",
  "judge",
  "command",
] as const)("labels the %s icon accessibly", (kind) => {
  const html = renderToStaticMarkup(
    <TrialValidations
      validations={[
        validationExecution(
          { id: `${kind}:0`, index: 0, name: "check", kind },
          null
        ),
      ]}
    />
  );
  expect(html).toContain(`aria-label="${kind}"`);
  expect(html).toContain('role="img"');
  expect(html.indexOf(`aria-label="${kind}"`)).toBeLessThan(
    html.indexOf(">check</span>")
  );
  expect(html).not.toContain(`>${kind}</span>`);
});

test("keeps each context payload and return once, with arguments still available", () => {
  const capture = validationCapture();
  const html = renderToStaticMarkup(
    <TrialValidations
      validations={[
        {
          ...validationExecution(
            { id: "code:0", index: 0, name: "check", kind: "code" },
            1000
          ),
          status: "passed",
          message: "Check passed",
          output: capture("unique return", "text"),
          calls: [
            {
              index: 0,
              method: "answer",
              startedAt: 1000,
              durationMs: 3,
              input: capture(["unique argument"]),
              output: capture("unique answer"),
              error: null,
            },
          ],
        },
      ]}
    />
  );
  expect(html.match(/unique answer/g)).toHaveLength(1);
  expect(html.match(/unique return/g)).toHaveLength(1);
  expect(html).toContain("unique argument");
  expect(html.indexOf("unique return")).toBeLessThan(
    html.indexOf("unique answer")
  );
});
