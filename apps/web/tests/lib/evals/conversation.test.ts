import { describe, expect, test } from "bun:test";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  artifactFor,
  conversationOf,
  durationOf,
  stepFailed,
  summaryOf,
  thinkingLabel,
} from "@/lib/evals/conversation";

const message = (
  role: "assistant" | "user",
  text: string
): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis: null,
  role,
  text,
  usage: null,
});

const command = (text: string, exitCode = 0): EvalJournalEntry => ({
  _tag: "command",
  command: text,
  exitCode,
  finishedAtMillis: null,
  output: "",
  startedAtMillis: null,
});

const wrote = (...paths: string[]): EvalJournalEntry => ({
  _tag: "fileChange",
  finishedAtMillis: null,
  paths,
});

describe("a journal read as a conversation", () => {
  test("folds the work between two turns into one part", () => {
    const parts = conversationOf([
      message("user", "make it live"),
      command("ls"),
      command("cat a"),
      wrote("a.ts"),
      message("assistant", "shall I push?"),
      message("user", "yes"),
      command("push"),
    ]);

    expect(parts.map((part) => part._tag)).toEqual([
      "said",
      "worked",
      "wrote",
      "replied",
      "said",
      "worked",
    ]);
    expect(parts[1]).toMatchObject({ steps: { length: 2 } });
  });

  test("keeps a key that does not move as the journal grows", () => {
    const first = conversationOf([message("user", "a"), command("ls")]);
    const grown = conversationOf([
      message("user", "a"),
      command("ls"),
      command("pwd"),
      message("assistant", "b"),
    ]);

    expect(grown.slice(0, 2).map((part) => part.key)).toEqual(
      first.map((part) => part.key)
    );
  });

  test("shows a file where it was last written, not at every edit", () => {
    const parts = conversationOf([wrote("a.ts"), command("ls"), wrote("a.ts")]);

    expect(parts.map((part) => part._tag)).toEqual(["worked", "wrote"]);
  });

  test("finds the artifact a sandbox path refers to", () => {
    const artifacts = [{ path: "autumn.config.ts" }, { path: "src/a.ts" }];

    expect(artifactFor("/tmp/task/autumn.config.ts", artifacts)).toBe(
      artifacts[0]
    );
    expect(artifactFor("/tmp/task/other.ts", artifacts)).toBeUndefined();
  });

  test("describes only the work that happened", () => {
    expect(summaryOf([command("ls")] as never)).toBe("Ran 1 command");
    expect(
      summaryOf([command("ls"), command("pwd"), wrote("a", "b")] as never)
    ).toBe("Ran 2 commands, wrote 2 files");
  });

  test("knows a command that failed from one that did not report", () => {
    expect(stepFailed(command("x", 1) as never)).toBe(true);
    expect(stepFailed(command("x", 0) as never)).toBe(false);
  });

  test("times a step only when both ends of it were recorded", () => {
    const timed = {
      ...command("x"),
      finishedAtMillis: 1500,
      startedAtMillis: 100,
    };

    expect(durationOf(timed as never)).toBe(1400);
    expect(durationOf(command("x") as never)).toBeNull();
    expect(durationOf(wrote("a") as never)).toBeNull();
  });
});

describe("the thinking indicator", () => {
  const said = { _tag: "said", key: 0, text: "go" } as const;
  const replied = { _tag: "replied", key: 1, text: "done" } as const;
  const worked = { _tag: "worked", key: 2, steps: [] } as const;

  test("waits on the agent after the user speaks", () => {
    expect(thinkingLabel([said], true)).toBe("Thinking");
  });

  test("keeps waiting between the agent's own turns", () => {
    expect(thinkingLabel([said, replied], true)).toBe("Working");
  });

  test("stays silent while a work block already reports the step", () => {
    expect(thinkingLabel([said, worked], true)).toBeNull();
  });

  test("stays silent once the trial is no longer running", () => {
    expect(thinkingLabel([said, replied], false)).toBeNull();
  });

  test("stays silent before anything has been journalled", () => {
    expect(thinkingLabel([], true)).toBeNull();
  });
});
