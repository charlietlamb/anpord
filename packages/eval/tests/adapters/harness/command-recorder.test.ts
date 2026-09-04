import { describe, expect, it } from "bun:test";
import {
  COMMAND_RECORDER,
  traceToEvents,
  withoutReported,
} from "../../../src/adapters/harness/command-recorder";
import type { HarnessEvent } from "../../../src/domain/harness-event";

/* Verbatim lines the recorder wrote in node:20-bookworm when sourced through
   BASH_ENV into `bash -c '…'`. The nested bash body is traced line by line;
   `sh -c` and the shell Node spawned leave only their own invocation. */
const OBSERVED = [
  '{"at":"2026-09-03T22:01:22Z","cwd":"/tmp","argv":"echo hello > notes.txt","source":"trap"}',
  '{"at":"2026-09-03T22:01:22Z","cwd":"/tmp","argv":"bash -c \\"ls notes.txt\\"","source":"trap"}',
  '{"at":"2026-09-03T22:01:22Z","cwd":"/tmp","argv":"ls notes.txt","source":"trap"}',
  '{"at":"2026-09-03T22:01:22Z","cwd":"/tmp","argv":"sh -c \\"echo from-dash\\"","source":"trap"}',
  '{"at":"2026-09-03T22:01:22Z","cwd":"/tmp","argv":"node -e \\"require(\\\\\\"child_process\\\\\\").execSync(\\\\\\"echo from-node\\\\\\")\\"","source":"trap"}',
  '{"at":"2026-09-03T22:01:22Z","cwd":"/tmp","argv":"printf \\"%s\\\\n\\" \\"tab\\there\\" \\"quote\\\\\\"here\\"","source":"trap"}',
];

const TRACE = `${OBSERVED.join("\n")}\n`;

describe("traceToEvents", () => {
  it("turns each trap line into a command without an exit code", () => {
    const events = traceToEvents(TRACE);

    expect(events).toHaveLength(OBSERVED.length);
    expect(events[0]).toEqual({
      _tag: "Command",
      at: Date.parse("2026-09-03T22:01:22Z"),
      command: "echo hello > notes.txt",
      exitCode: null,
      output: "",
    });
  });

  it("reads the escaping the recorder wrote by hand", () => {
    const commands = traceToEvents(TRACE).map((event) => event.command);

    expect(commands[1]).toBe('bash -c "ls notes.txt"');
    expect(commands[4]).toBe(
      'node -e "require(\\"child_process\\").execSync(\\"echo from-node\\")"'
    );
    expect(commands[5]).toBe('printf "%s\\n" "tab\there" "quote\\"here"');
  });

  it("skips a line it cannot read", () => {
    const events = traceToEvents(
      [
        "",
        "not json",
        '{"argv":"missing at"}',
        '{"at":"yesterday","argv":"bad date"}',
        OBSERVED[2],
      ].join("\n")
    );

    expect(events.map((event) => event.command)).toEqual(["ls notes.txt"]);
  });
});

describe("withoutReported", () => {
  it("drops a trace command the process reported itself", () => {
    const trace = traceToEvents(TRACE);
    const reported: HarnessEvent[] = [
      {
        _tag: "Command",
        at: 1,
        command: "ls notes.txt",
        exitCode: 0,
        output: "notes.txt\n",
      },
      { _tag: "Message", at: 1, role: "assistant", text: "ls notes.txt" },
    ];

    const kept = withoutReported(trace, reported).map((event) => event.command);

    expect(kept).not.toContain("ls notes.txt");
    expect(kept).toHaveLength(OBSERVED.length - 1);
  });

  it("keeps a trace command whose argv differs at all", () => {
    const trace = traceToEvents(TRACE);
    const reported: HarnessEvent[] = [
      { _tag: "Command", at: 1, command: "ls", exitCode: 0, output: "" },
    ];

    expect(withoutReported(trace, reported)).toHaveLength(OBSERVED.length);
  });
});

describe("the recorder script", () => {
  it("installs nothing without a log to write to", () => {
    expect(COMMAND_RECORDER).toContain('if [ -n "$ANPORD_TRACE_LOG" ]; then');
  });

  it("guards the trap against tracing itself", () => {
    expect(COMMAND_RECORDER).toContain('[ -n "$ANPORD_TRACING" ] && return');
    expect(COMMAND_RECORDER).toContain(
      "anpord_trace* | anpord_escape*) return"
    );
  });

  it("is valid bash", () => {
    const check = Bun.spawnSync(["bash", "-n"], {
      stdin: Buffer.from(COMMAND_RECORDER),
    });

    expect(check.exitCode).toBe(0);
  });
});
