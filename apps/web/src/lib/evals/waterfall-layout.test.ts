import { describe, expect, it } from "bun:test";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { waterfallLayout } from "./waterfall-layout";

const command = (
  startedAtMillis: number | null,
  finishedAtMillis: number | null
): EvalJournalEntry => ({
  _tag: "command",
  command: "ls",
  exitCode: 0,
  finishedAtMillis,
  output: "",
  startedAtMillis,
});

const message = (finishedAtMillis: number | null): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis,
  text: "thinking",
});

describe("laying out a trajectory", () => {
  /* The real numbers from a captured Codex run: the command ran 4986ms and
     that is what a bar must be drawn from. */
  it("measures a bar from both of its ends", () => {
    const { rows, spanMs } = waterfallLayout([
      message(6924),
      command(7673, 12_659),
    ]);

    expect(spanMs).toBe(12_659 - 6924);

    const bar = rows.find((row) => row._tag === "bar");

    if (bar?._tag !== "bar") {
      throw new Error("expected a bar");
    }

    expect(bar.durationMs).toBe(4986);
    expect(bar.widthPercent).toBeCloseTo((4986 / 5735) * 100);
  });

  it("places a marker at its one moment", () => {
    const { rows } = waterfallLayout([message(0), command(50, 100)]);
    const marker = rows.find((row) => row._tag === "marker");

    expect(marker?.leftPercent).toBe(0);
  });

  /** A command whose start was never recorded still has to appear. Dropping
   * it would hide work the agent actually did. */
  it("keeps a command that has no start", () => {
    const { rows } = waterfallLayout([command(null, 500), command(0, 100)]);
    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row._tag === "marker")).toBe(true);
  });

  /** The gap between one event ending and the next beginning, which on a real
   * trial is most of the elapsed time and the reason the chart is worth
   * drawing at all. */
  it("draws the gap before a step as its lead", () => {
    const { rows, thinkingMs } = waterfallLayout([
      command(0, 1000),
      command(4000, 5000),
    ]);

    expect(rows[0]?.lead).toBe(null);
    expect(rows[1]?.lead?.durationMs).toBe(3000);
    expect(thinkingMs).toBe(3000);
  });

  /** Every millisecond is either work or waiting, so the two must account for
   * the whole span. A thinking row that started from the wrong moment would
   * double-count and push the last row past the axis. */
  it("accounts for the whole span with no overlap", () => {
    const { rows, spanMs, thinkingMs, workingMs } = waterfallLayout([
      command(0, 1000),
      command(4000, 5000),
      command(9000, 12_000),
    ]);

    /* Every millisecond is either work or waiting, so the two must account
       for the whole span. A lead measured from the wrong moment would
       double-count and push a bar past the axis. */
    expect(thinkingMs + workingMs).toBe(spanMs);

    const bars = rows.filter((row) => row._tag === "bar");

    expect(
      bars.every((row) => row.leftPercent + row.widthPercent <= 100.001)
    ).toBe(true);
  });

  /** Back-to-back events are not a decision worth a row: the gap is the cost
   * of recording two events, and a row per pair would double the height of
   * every trajectory for nothing. */
  it("draws no lead between adjacent events", () => {
    const { rows, thinkingMs } = waterfallLayout([
      command(0, 1000),
      command(1000, 2000),
    ]);

    expect(rows.every((row) => row.lead === null)).toBe(true);
    expect(thinkingMs).toBe(0);
  });

  it("returns nothing for a trial that recorded no moments", () => {
    const { rows, spanMs } = waterfallLayout([command(null, null)]);

    expect(rows).toEqual([]);
    expect(spanMs).toBe(0);
  });

  it("never divides by zero", () => {
    const { spanMs } = waterfallLayout([command(100, 100)]);

    expect(spanMs).toBe(1);
  });
});
