import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialBadge } from "./eval-status-badge";

test.each([
  ["passed", "bg-success/15"],
  ["failed", "bg-destructive/15"],
  ["running", "bg-warning/15"],
  ["void", "bg-warning/15"],
] as const)("shows a %s trial as one numbered badge", (status, background) => {
  const html = renderToStaticMarkup(<TrialBadge ordinal={1} status={status} />);
  expect(html).toContain(background);
  expect(html).toContain(`Trial 1: ${status}`);
  expect(html).not.toContain("<svg");
});
