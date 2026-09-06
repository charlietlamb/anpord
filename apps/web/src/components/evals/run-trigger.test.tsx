import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RunTrigger } from "./run-trigger";

const trigger = {
  source: "ci",
  url: "https://github.com/acme/app/actions/runs/123",
} as const;

test("the run list shows a label without nesting links", () => {
  const html = renderToStaticMarkup(<RunTrigger trigger={trigger} />);
  expect(html).toContain("GitHub Actions");
  expect(html).toContain("<svg");
  expect(html).toContain("text-xs");
  expect(html).not.toContain("<a ");
});

test("keeps other CI providers generic", () => {
  for (const url of [
    undefined,
    "https://ci.example.com/123",
    "https://github.com.example.com/123",
  ]) {
    const html = renderToStaticMarkup(
      <RunTrigger trigger={{ source: "ci", ...(url ? { url } : {}) }} />
    );
    expect(html).toContain(">CI</span>");
    expect(html).not.toContain("GitHub Actions");
  }
});

test("run details link to the triggering CI run", () => {
  const html = renderToStaticMarkup(<RunTrigger linked trigger={trigger} />);
  expect(html).toContain(`href="${trigger.url}"`);
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain("h-6 items-center gap-2 text-foreground text-xs");
  expect(html).not.toContain("↗");
});

test("legacy runs are not labelled as API calls", () => {
  const html = renderToStaticMarkup(<RunTrigger trigger={null} />);
  expect(html).toContain("Unknown");
  expect(html).not.toContain("API");
});
