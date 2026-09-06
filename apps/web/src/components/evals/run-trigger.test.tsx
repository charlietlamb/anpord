import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RunTrigger } from "./run-trigger";

const trigger = {
  source: "ci",
  url: "https://github.com/acme/app/actions/runs/123",
} as const;

test("the run list shows a label without nesting links", () => {
  const html = renderToStaticMarkup(<RunTrigger trigger={trigger} />);
  expect(html).toContain("CI");
  expect(html).not.toContain("<a ");
});

test("run details link to the triggering CI run", () => {
  const html = renderToStaticMarkup(<RunTrigger linked trigger={trigger} />);
  expect(html).toContain(`href="${trigger.url}"`);
  expect(html).toContain('rel="noopener noreferrer"');
});

test("legacy runs are not labelled as API calls", () => {
  const html = renderToStaticMarkup(<RunTrigger trigger={null} />);
  expect(html).toContain("Unknown");
  expect(html).not.toContain("API");
});
