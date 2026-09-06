import { expect, test } from "bun:test";
import {
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialValidations } from "./trial-validations";

test("shows each validator, exact return, and error without nested cards", () => {
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
  expect(html.match(/<details/g)).toHaveLength(2);
  expect(html.match(/rounded-lg/g)).toHaveLength(1);
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
  expect(html).not.toContain(`>${kind}</span>`);
});
