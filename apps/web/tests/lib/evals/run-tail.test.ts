import { describe, expect, test } from "bun:test";
import type { EvalRunTail } from "@anpord/schema/domain/eval-tail";
import type { EvalJournalEntry, EvalRun } from "@anpord/schema/domain/evals";
import { heardTail, NOTHING_HEARD, overlayTail } from "@/lib/evals/run-tail";

const said = (text: string): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis: null,
  role: "user",
  text,
  usage: null,
});

const wrote = (path: string): EvalJournalEntry => ({
  _tag: "fileChange",
  finishedAtMillis: null,
  paths: [path],
});

const read = (entries: readonly EvalJournalEntry[]): EvalRunTail => ({
  events: entries.map((entry, seq) => ({ cell: "c1", entry, ordinal: 1, seq })),
  next: [{ cell: "c1", ordinal: 1, seq: entries.length - 1 }],
  running: true,
  settled: 0,
});

const runWith = (status: string, trajectory: readonly EvalJournalEntry[]) =>
  ({
    cells: [
      {
        internalId: "c1",
        trials: [
          { commands: 0, filesChanged: [], ordinal: 1, status, trajectory },
        ],
      },
    ],
  }) as unknown as EvalRun;

const trialOf = (run: EvalRun) => run.cells[0]?.trials[0];

describe("a run's tail", () => {
  test("gathers each read into the trial's whole journal", () => {
    const first = heardTail(NOTHING_HEARD, read([said("open")]));
    const second = heardTail(first, read([wrote("a.ts")]));

    expect(second.journals.get("c1#1")).toEqual([said("open"), wrote("a.ts")]);
  });

  test("lays a longer journal over a running trial", () => {
    const heard = heardTail(NOTHING_HEARD, read([said("open"), wrote("a.ts")]));
    const live = trialOf(overlayTail(runWith("running", []), heard.journals));

    expect(live?.trajectory).toHaveLength(2);
    expect(live?.filesChanged).toEqual(["a.ts"]);
  });

  test("changes nothing when laid over twice", () => {
    const heard = heardTail(NOTHING_HEARD, read([said("open")]));
    const once = overlayTail(runWith("running", []), heard.journals);

    expect(overlayTail(once, heard.journals)).toEqual(once);
  });

  test("leaves a settled trial as the record has it", () => {
    const heard = heardTail(NOTHING_HEARD, read([said("open"), wrote("a.ts")]));
    const settled = runWith("passed", [said("open")]);

    expect(overlayTail(settled, heard.journals)).toEqual(settled);
  });
});
