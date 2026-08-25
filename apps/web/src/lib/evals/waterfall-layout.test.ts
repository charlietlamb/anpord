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
  /** A journal is usually chronological but nothing guarantees it. An entry
   * landing behind the one before it used to drag the cursor back, so the
   * overlap was billed twice and the trial reported more thinking than it had
   * time for. The conservation test above passed throughout, because every
   * fixture it used was already sorted. */
  it("bills no time twice when an entry lands out of order", () => {
    const { spanMs, thinkingMs, workingMs } = waterfallLayout([
      command(0, 1000),
      command(null, 500),
      command(2000, 3000),
    ]);

    expect(thinkingMs + workingMs).toBeLessThanOrEqual(spanMs);
  });

  it("draws no lead for an entry that finished before the one before it", () => {
    const { rows } = waterfallLayout([command(5000, 6000), command(0, 1000)]);

    expect(rows[1]?.lead).toBe(null);
  });
});

const toolCall = (
  startedAtMillis: number | null,
  finishedAtMillis: number | null
): EvalJournalEntry => ({
  _tag: "toolCall",
  finishedAtMillis,
  name: "getPlan",
  startedAtMillis,
  status: "ok",
});

describe("timing a tool call", () => {
  /* A harness that reports both ends of a call gives it a real width, the
     same as it would a command. Drawn as a dot, a call that ran a third of a
     second was indistinguishable from one that returned instantly. */
  it("draws a bar for a call reported at both ends", () => {
    const { rows } = waterfallLayout([toolCall(1000, 1303)]);

    expect(rows[0]?._tag).toBe("bar");
    expect(rows[0]?._tag === "bar" ? rows[0].durationMs : null).toBe(303);
  });

  it("leaves a call with no start as a marker", () => {
    const { rows } = waterfallLayout([toolCall(null, 1303)]);

    expect(rows[0]?._tag).toBe("marker");
  });

  /* A zero-width bar renders as nothing at all, which reads as a dropped row
     rather than as a fast call. */
  it("leaves a call that reports no elapsed time as a marker", () => {
    const { rows } = waterfallLayout([toolCall(1000, 1000)]);

    expect(rows[0]?._tag).toBe("marker");
  });

  /* The rail reads workingMs as time spent running commands in the sandbox,
     and a tool call the harness answered itself never went near one. */
  it("keeps a tool call out of the time spent running commands", () => {
    const { workingMs } = waterfallLayout([
      command(0, 1000),
      toolCall(1000, 1500),
    ]);

    expect(workingMs).toBe(1000);
  });
});
