import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ValidationSource } from "./validation-source";

test("shows the original TypeScript with the shared file select", () => {
  const html = renderToStaticMarkup(
    <ValidationSource
      files={[
        { path: "validate.ts", content: "const valid: boolean = true;\n" },
        { path: "judges.ts", content: "export const name = 'correct';" },
      ]}
    />
  );
  expect(html).toContain('data-slot="select-trigger"');
  expect(html).toContain('aria-label="Source file"');
  expect(html).not.toContain("<select");
  expect(html).toContain("const valid: boolean = true;\n");
  expect(html).toContain("Copy validate.ts");
  expect(html).toContain("<h3");
  expect(html).not.toContain("group/surface");
  expect(html.split("rounded-xl border")).toHaveLength(2);
  expect(html.match(/>validate.ts</g)).toHaveLength(1);
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
