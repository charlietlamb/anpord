import { expect, test } from "bun:test";
import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { renderToStaticMarkup } from "react-dom/server";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";
import { TimedRow } from "../../../src/components/evals/waterfall-row";

const render = (row: WaterfallRow) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <TimedRow onSelect={() => undefined} row={row} selected={false} />
    </TooltipProvider>
  );

test("a tool's wait is tinted with its own colour, not the thinking colour", () => {
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

  expect(html).toContain("var(--trace-tool)");
  expect(html).not.toContain("--trace-thinking");
  expect(html).not.toContain("repeating-linear-gradient");
});

test("a bar keeps its own width, and its wait is drawn beside it", () => {
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

  /* The wait runs up to the bar; the bar is not widened to swallow it. */
  expect(html).toContain("width:50%");
  expect(html).toContain("width:0.2%");
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
});

test("a message that was waited for keeps its marker", () => {
  const html = render({
    _tag: "marker",
    entry: { _tag: "message", text: "Ready", finishedAtMillis: 6000 },
    lead: { durationMs: 3000, fromPercent: 50, widthPercent: 50 },
    leftPercent: 100,
  });

  /* The wait no longer replaces the moment it led to. */
  expect(html).toContain("background:var(--trace-message)");
  expect(html).toContain("left:50%;width:50%");
});
