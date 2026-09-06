import { expect, test } from "bun:test";
import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { renderToStaticMarkup } from "react-dom/server";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";
import { TimedRow } from "./waterfall-row";

const render = (row: WaterfallRow) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <TimedRow row={row} />
    </TooltipProvider>
  );

test("a tool's striped interval uses its color without a solid end cap", () => {
  const html = render({
    _tag: "bar",
    durationMs: 12,
    entry: {
      _tag: "toolCall",
      name: "inventory.lookup",
      status: "completed",
      startedAtMillis: 3000,
      finishedAtMillis: 3012,
    },
    lead: { durationMs: 3000, fromPercent: 0, widthPercent: 50 },
    leftPercent: 50,
    widthPercent: 0.2,
  });

  expect(html).toContain("var(--trace-tool) 0 3px");
  expect(html).toContain("width:50.2%");
  expect(html).not.toContain("--trace-thinking");
  expect(html.match(/style=/g)).toHaveLength(1);
});

test("an event without a lead remains a single marker", () => {
  const html = render({
    _tag: "marker",
    entry: { _tag: "message", text: "Ready", finishedAtMillis: 100 },
    lead: null,
    leftPercent: 0,
  });

  expect(html).toContain("background:var(--trace-message)");
  expect(html).not.toContain("repeating-linear-gradient");
  expect(html.match(/style=/g)).toHaveLength(1);
});

test("a message's striped interval ends without a solid marker", () => {
  const html = render({
    _tag: "marker",
    entry: { _tag: "message", text: "Ready", finishedAtMillis: 6000 },
    lead: { durationMs: 3000, fromPercent: 50, widthPercent: 50 },
    leftPercent: 100,
  });

  expect(html).toContain("var(--trace-message) 0 3px");
  expect(html).toContain("left:50%;width:50%");
  expect(html.match(/style=/g)).toHaveLength(1);
});
