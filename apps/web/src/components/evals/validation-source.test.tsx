import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ValidationSource } from "./validation-source";

test("shows the original TypeScript and file choices", () => {
  const html = renderToStaticMarkup(
    <ValidationSource
      files={[
        { path: "validate.ts", content: "const valid: boolean = true;\n" },
        { path: "judges.ts", content: "export const name = 'correct';" },
      ]}
    />
  );
  expect(html).toContain("const valid: boolean = true;\n");
  expect(html).toContain('value="judges.ts"');
  expect(html).toContain("Copy validate.ts");
  expect(html).toContain('aria-expanded="true"');
  expect(html.match(/rounded-lg border/g)).toHaveLength(1);
  expect(html).not.toContain("rounded-xl border");
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
