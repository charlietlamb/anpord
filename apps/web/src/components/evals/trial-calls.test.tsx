import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialCalls } from "./trial-calls";

test("shows tool inputs, results, and errors in recorded order", () => {
  const html = renderToStaticMarkup(
    <TrialCalls
      trajectory={[
        {
          _tag: "toolCall",
          name: "catalog.get",
          input: '{"id":"missing"}',
          error: "Unknown item",
          status: "failed",
          finishedAtMillis: 1,
        },
        {
          _tag: "toolCall",
          name: "catalog.get",
          input: '{"id":"fixture"}',
          output: '{"name":"Fixture"}',
          status: "completed",
          finishedAtMillis: 2,
        },
      ]}
    />
  );
  expect(html).toContain("Unknown item");
  expect(html).toContain("Fixture");
  expect(html.indexOf("missing")).toBeLessThan(html.indexOf("fixture"));
  expect(html).toContain("Input");
  expect(html).toContain("Output");
  expect(html).toContain("Error");
  expect(html.match(/<details/g)).toHaveLength(5);
  expect(html).toContain("2 calls");
  expect(html).toContain("<h3");
  expect(html).not.toContain("aria-expanded=");
  expect(html).not.toContain("divide-");
});

test("does not invent results for older tool calls", () => {
  const html = renderToStaticMarkup(
    <TrialCalls
      trajectory={[
        {
          _tag: "toolCall",
          name: "catalog.get",
          status: null,
          finishedAtMillis: null,
        },
      ]}
    />
  );
  expect(html.match(/Not recorded/g)).toHaveLength(2);
  expect(html).toContain("Status not recorded");
});

test("shows CLI command, output, exit status, and explicit truncation", () => {
  const html = renderToStaticMarkup(
    <TrialCalls
      trajectory={[
        {
          _tag: "command",
          command: "catalog get --id missing",
          output: "<script>Unknown item</script>",
          outputTruncated: true,
          exitCode: 1,
          startedAtMillis: 0,
          finishedAtMillis: 1,
        },
      ]}
    />
  );
  expect(html).toContain("catalog get --id missing");
  expect(html).toContain("Exit 1");
  expect(html).toContain("Truncated");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
});

test("does not render an empty calls section", () => {
  expect(renderToStaticMarkup(<TrialCalls trajectory={[]} />)).toBe("");
});

test("weights the tool name above the server it came from", () => {
  const html = renderToStaticMarkup(
    <TrialCalls
      trajectory={[
        {
          _tag: "toolCall",
          name: "notra-markdown.get_markdown",
          input: "{}",
          output: "ok",
          status: "completed",
          finishedAtMillis: 1,
        },
      ]}
    />
  );
  expect(html).toContain("notra-markdown.");
  expect(html).toContain("get_markdown");
  expect(html).toContain("font-medium text-foreground");
});
