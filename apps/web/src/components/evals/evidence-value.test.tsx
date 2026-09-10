import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EvidenceValue } from "./evidence-value";

test("decodes captured text safely and preserves line breaks", () => {
  const html = renderToStaticMarkup(
    <EvidenceValue
      label="Answer"
      value={JSON.stringify("First line\n<script>unsafe</script>")}
    />
  );
  expect(html).toContain("First line");
  expect(html).toContain("&lt;script&gt;unsafe&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<pre");
});

test("keeps structured values as code and distinguishes empty from unavailable", () => {
  expect(
    renderToStaticMarkup(
      <EvidenceValue label="Result" value='{"passed":false}' />
    )
  ).toContain("<pre");
  expect(
    renderToStaticMarkup(<EvidenceValue label="Result" value='""' />)
  ).toContain("(empty)");
  expect(
    renderToStaticMarkup(<EvidenceValue label="Result" value={undefined} />)
  ).toContain("Not recorded");
  expect(
    renderToStaticMarkup(
      <EvidenceValue
        label="Result"
        unavailable="Capture disabled"
        value={undefined}
      />
    )
  ).toContain("Capture disabled");
});

test("disclosures keep one label, an accessible copy action, and truncation state", () => {
  const html = renderToStaticMarkup(
    <EvidenceValue
      disclosure
      label="Instructions"
      truncated
      value="Evaluate the answer"
    />
  );
  expect(html).toContain("<details");
  expect(html).not.toContain("<details open");
  expect(html.match(/>Instructions</g)).toHaveLength(1);
  expect(html).toContain('aria-label="Copy Instructions"');
  expect(html).toContain("Truncated");
});

test("renders Markdown emphasis, lists, links and code without executing HTML", () => {
  const html = renderToStaticMarkup(
    <EvidenceValue
      label="Answer"
      value={
        "The server is **`checkout-api-staging`**.\n\n- **Cause:** missing token\n- **Fix:** [Settings](https://example.com)\n\n```sh\necho ready\n```\n\n[bad](javascript:alert%281%29)\n\n<img src=x onerror=alert(1)>"
      }
    />
  );
  expect(html).toContain("checkout-api-staging");
  expect(html).toContain("<strong>");
  expect(html).toContain("<ul>");
  expect(html).toContain("<li><strong>Cause:</strong>");
  expect(html).toContain('href="https://example.com"');
  expect(html).toContain("echo ready");
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain("<img");
});

test("shows the readable message from a tool response envelope and keeps raw JSON available", () => {
  const html = renderToStaticMarkup(
    <EvidenceValue
      label="Output"
      value={JSON.stringify({
        content: [
          { type: "text", text: "# Deploying Notra\n\nDeployment complete." },
        ],
        structured_content: {
          content: "# Deploying Notra\n\nDeployment complete.",
        },
      })}
    />
  );
  expect(html).toContain("<h1>Deploying Notra</h1>");
  expect(html).toContain("Raw value");
  expect(html).toContain("structured_content");
});

test("preserves every text block in a tool response", () => {
  const html = renderToStaticMarkup(
    <EvidenceValue
      label="Output"
      value={JSON.stringify({
        content: [
          { type: "text", text: "First block" },
          { type: "text", text: "Second block" },
        ],
      })}
    />
  );
  expect(html).toContain("<p>First block</p>");
  expect(html).toContain("<p>Second block</p>");
});

test("unwraps JSON nested inside a tool response text block", () => {
  const html = renderToStaticMarkup(
    <EvidenceValue
      label="Output"
      value={JSON.stringify({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              lineCount: 20,
              success: true,
              updatedMarkdown: "# Deploying Notra\n\nRuns on Bun.",
            }),
          },
        ],
      })}
    />
  );
  expect(html).toContain("<pre");
  expect(html).not.toContain('\\"lineCount\\"');
});

test("keeps line-numbered output preformatted instead of folding it into prose", () => {
  const html = renderToStaticMarkup(
    <EvidenceValue
      label="Output"
      value={JSON.stringify({
        content: [
          {
            type: "text",
            text: "1: # Deploying Notra\n2:\n3: Notra runs on Bun.\n4:\n5: ## Prerequisites",
          },
        ],
      })}
    />
  );
  expect(html).toContain("<pre");
  expect(html).not.toContain("<h1>");
});

test("renders real markdown as prose rather than a code block", () => {
  const html = renderToStaticMarkup(
    <EvidenceValue
      label="Output"
      value={JSON.stringify({
        content: [{ type: "text", text: "# Heading\n\nSome prose here." }],
      })}
    />
  );
  expect(html).toContain("<h1>Heading</h1>");
});
