import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialCalls } from "../../../src/components/evals/trial-calls";

test("lists every call in the order it was recorded", () => {
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
  expect(html).toContain("catalog.");
  expect(html).toContain(">get<");
  expect(html).toContain("2 calls");
  /* The failed call is marked where it sits, not summarised away. */
  expect(html).toContain("1 failed");
  expect(html.match(/tabular-nums">1</g)).toHaveLength(1);
  expect(html.match(/tabular-nums">2</g)).toHaveLength(1);
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
  /* Nothing was recorded, so the row carries no verdict of its own. */
  expect(html).toContain("1 call");
  expect(html).not.toContain("failed");
  expect(html).not.toContain("exit");
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
  expect(html).toContain("exit 1");
  expect(html).toContain("1 failed");
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
