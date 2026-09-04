import { describe, expect, it } from "bun:test";
import type { HarnessEvent } from "../../../src/domain/harness-event";
import { FINISHED, journal, line, WORKSPACE } from "./command-fake";

describe("a command harness process that exits non-zero", () => {
  it("keeps the journal it printed before Finished", async () => {
    const { events } = await journal({
      exitCode: 1,
      stdout: [
        line({ _tag: "Message", role: "assistant", text: "done" }),
        FINISHED,
      ],
    });

    expect(events.map((event) => event._tag)).toEqual(["Message", "Finished"]);
    expect(events.at(-1)).toEqual({ _tag: "Finished", at: 11, reason: "done" });
  });

  it("closes a journal that never finished with the exit itself", async () => {
    const { events } = await journal({
      exitCode: 7,
      stdout: [line({ _tag: "Message", role: "assistant", text: "half" })],
    });

    expect(events.at(-1)).toEqual({
      _tag: "Finished",
      at: 50,
      reason: "exit 7",
    });
  });
});

describe("the command harness trace fold", () => {
  const traceLine = (argv: string) =>
    JSON.stringify({
      argv,
      at: "2026-09-03T10:00:00Z",
      cwd: WORKSPACE,
      source: "trap",
    });

  it("appends only the commands the process did not report", async () => {
    const { events } = await journal({
      stdout: [
        line({
          _tag: "Command",
          command: "wc -l notes.txt",
          exitCode: 0,
          output: "1",
        }),
        FINISHED,
      ],
      trace: [traceLine("wc -l notes.txt"), traceLine("./agent.sh"), ""].join(
        "\n"
      ),
    });

    const commands = events.filter(
      (event): event is Extract<HarnessEvent, { _tag: "Command" }> =>
        event._tag === "Command"
    );

    expect(commands.map((event) => event.command)).toEqual([
      "wc -l notes.txt",
      "./agent.sh",
    ]);
    /* The trap runs before the command, so the fold's own entries can only
       say that something ran. */
    expect(commands.at(-1)?.exitCode).toBeNull();
  });

  it("adds nothing when the recorder saw no bash at all", async () => {
    const { events } = await journal({ stdout: [FINISHED], trace: "" });

    expect(events.map((event) => event._tag)).toEqual(["Finished"]);
  });
});
