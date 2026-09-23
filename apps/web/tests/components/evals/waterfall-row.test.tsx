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

test("a tool's work keeps its own colour while its wait is a neutral hatch", () => {
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
  expect(html).toContain("repeating-linear-gradient");
});

test("a waited-for step draws the wait as a hatch and the work as a bar", () => {
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

  expect(html).toContain("left:0%;width:50%");
  expect(html).toContain("left:50%;min-width:3px;width:0.2%");
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

test("a message that was waited for spans the wait it ended", () => {
  const html = render({
    _tag: "marker",
    entry: { _tag: "message", text: "Ready", finishedAtMillis: 6000 },
    lead: { durationMs: 3000, fromPercent: 50, widthPercent: 50 },
    leftPercent: 100,
  });

  expect(html).toContain("background:var(--trace-message)");
  expect(html).toContain("left:50%");
  expect(html).toContain("width:50%");
});
