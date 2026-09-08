import { expect, test } from "bun:test";
import {
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import { renderToStaticMarkup } from "react-dom/server";
import { ValidationInspector } from "./validation-inspector";

const capture = validationCapture();
const validation = {
  ...validationExecution(
    { id: "code:0", index: 0, name: "checkAnswer", kind: "code" },
    1000
  ),
  status: "passed" as const,
  output: capture(true),
  calls: [
    {
      index: 0,
      method: "answer" as const,
      input: capture([]),
      output: capture("Unique trial one answer", "text"),
      startedAt: 1000,
      durationMs: 3,
      error: null,
    },
  ],
};

test("shows actual context reads alongside the return, with source secondary", () => {
  const html = renderToStaticMarkup(
    <ValidationInspector
      files={[
        { path: "secret-source.ts", content: "source must start hidden" },
      ]}
      trials={[{ ordinal: 1, validations: [validation] }]}
    />
  );
  expect(html).toContain("Unique trial one answer");
  expect(html).toContain("answer()");
  expect(html).toContain("Return value");
  expect(html).toContain("1/1 passed");
  expect(html).not.toContain("source must start hidden");
  expect(html).not.toContain('aria-label="Validation trial"');
});

test("aggregates results without merging trial payloads or counting missing captures as passes", () => {
  const html = renderToStaticMarkup(
    <ValidationInspector
      trials={[
        { ordinal: 1, validations: [validation] },
        {
          ordinal: 2,
          validations: [
            {
              ...validation,
              status: "failed",
              output: capture("Unique trial two result", "text"),
            },
          ],
        },
        { ordinal: 3 },
      ]}
    />
  );
  expect(html).toContain("1/3 passed");
  expect(html).toContain("1 not recorded");
  expect(html).toContain("Inspect checkAnswer results");
  expect(html).not.toContain("Unique trial one answer");
  expect(html).not.toContain("Unique trial two result");
});
