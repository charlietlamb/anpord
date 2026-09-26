import { describe, expect, test } from "bun:test";
import {
  describeCommand,
  describeStep,
  summarizeMessage,
} from "@/lib/evals/step-title";

describe("describeCommand", () => {
  test("names the file a read prints", () => {
    expect(
      describeCommand(
        "/bin/zsh -lc \"sed -n '1,240p' /tmp/skills/autumn-setup/SKILL.md\""
      )
    ).toEqual({ target: "SKILL.md", title: "Read SKILL.md", verb: "read" });
  });

  test("counts files when reads are chained", () => {
    const title = describeCommand(
      "sed -n '1,220p' docs/feature.md && cat docs/plan-items.md"
    );

    expect(title.title).toBe("Read 2 files");
    expect(title.target).toBe("feature.md, plan-items.md");
  });

  test("reads a search by its pattern", () => {
    expect(describeCommand('rg -n "rollover|expiry" references')).toEqual({
      target: "references",
      title: "Searched for rollover|expiry",
      verb: "searched",
    });
  });

  test("treats a file listing as a listing, even when piped", () => {
    expect(
      describeCommand("rg --files -g 'autumn.config.ts' | sort").title
    ).toBe("Listed files");
  });

  test("names the tool a package runner launches", () => {
    expect(describeCommand("npx atmn push")).toEqual({
      target: "atmn push",
      title: "Ran atmn push",
      verb: "ran",
    });
  });

  test("names a package script", () => {
    expect(describeCommand("bun run typecheck").title).toBe(
      "Ran the typecheck script"
    );
  });

  test("falls back to the program for anything else", () => {
    expect(describeCommand("git status --short").title).toBe("Ran git status");
    expect(describeCommand("").title).toBe("Ran a command");
  });
});

describe("describeStep", () => {
  test("names a written file", () => {
    expect(
      describeStep({
        _tag: "fileChange",
        finishedAtMillis: null,
        paths: ["/work/autumn.config.ts"],
      })
    ).toEqual({
      target: "autumn.config.ts",
      title: "Wrote autumn.config.ts",
      verb: "wrote",
    });
  });

  test("tells your messages from the agent's", () => {
    const said = (role: "assistant" | "user") =>
      describeStep({
        _tag: "message",
        finishedAtMillis: null,
        role,
        text: "Hello there.",
      }).verb;

    expect(said("user")).toBe("you");
    expect(said("assistant")).toBe("agent");
  });
});

describe("summarizeMessage", () => {
  test("keeps the first sentence without markup", () => {
    expect(
      summarizeMessage("Configured **autumn.config.ts**. The dry run passed.")
    ).toBe("Configured autumn.config.ts.");
  });

  test("keeps a message with no sentence end whole", () => {
    expect(summarizeMessage("credits carry over")).toBe("credits carry over");
  });
});

describe("describeCommand with a redirect", () => {
  test("names the file a redirect writes", () => {
    expect(describeCommand("echo hello > hello.txt")).toEqual({
      target: "hello.txt",
      title: "Wrote hello.txt",
      verb: "wrote",
    });
  });

  test("treats an append the same way", () => {
    expect(describeCommand("printf 'a' >> /work/notes.md").title).toBe(
      "Wrote notes.md"
    );
  });

  test("ignores output thrown away", () => {
    expect(describeCommand("npx atmn push > /dev/null").title).toBe(
      "Ran atmn push"
    );
  });
});
