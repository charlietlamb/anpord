import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ValidationSource } from "../../../src/components/evals/validation-source";

test("shows every source file in full, each with its own copy button", () => {
  const html = renderToStaticMarkup(
    <ValidationSource
      files={[
        { path: "validate.ts", content: "const valid: boolean = true;\n" },
        { path: "judges.ts", content: "export const name = 'correct';" },
      ]}
    />
  );
  expect(html).toContain("const valid: boolean = true;");
  expect(html).toContain("export const name");
  expect(html).toContain("Copy validate.ts");
  expect(html).toContain("Copy judges.ts");
  expect(html).not.toContain("<select");
});

test("renders source as text, not executable markup", () => {
  const html = renderToStaticMarkup(
    <ValidationSource
      files={[
        { path: "validate.ts", content: "<script>alert('source')</script>" },
      ]}
    />
  );
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<select");
});

test("does not invent source for older runs", () => {
  expect(renderToStaticMarkup(<ValidationSource files={[]} />)).toContain(
    "Source unavailable for this run."
  );
});

test("does not show a selector for a single source file", () => {
  const html = renderToStaticMarkup(
    <ValidationSource
      files={[{ path: "eval.ts", content: "export default {}" }]}
    />
  );
  expect(html).not.toContain('data-slot="select-trigger"');
  expect(html).toContain("eval.ts");
});
