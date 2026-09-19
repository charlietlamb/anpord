import { describe, expect, it } from "bun:test";
import { Option } from "effect";
import { claudeCommand } from "../../../src/adapters/harness/claude";
import { codexCommand } from "../../../src/adapters/harness/codex";

const request = (resume: Option.Option<string>, harness = "codex") =>
  ({
    env: {},
    harness,
    harnessVersion: "1",
    model: "gpt-5.6-sol",
    profile: Option.none(),
    prompt: "yes, go ahead",
    resume,
    sandbox: { home: "/home" },
    systemPromptPath: Option.none(),
    workspace: "/workspace",
  }) as never;

describe("codex", () => {
  it("opens a conversation with no subcommand", () => {
    const command = codexCommand(request(Option.none()));

    expect(command).toContain("codex exec --json");
    expect(command).not.toContain("resume");
  });

  /* `exec resume [OPTIONS] <SESSION_ID> <PROMPT>`: the subcommand sits
     directly after exec, and the session directly before the prompt. */
  it("continues one as exec resume, session before prompt", () => {
    const command = codexCommand(request(Option.some("sess-1")));

    expect(command).toContain("codex exec resume --json");
    expect(command.indexOf("'sess-1'")).toBeLessThan(
      command.indexOf("'yes, go ahead'")
    );
  });
});

describe("claude", () => {
  it("opens a conversation with no resume flag", () => {
    expect(claudeCommand(request(Option.none(), "claude"))).not.toContain(
      "--resume"
    );
  });

  it("continues one with the session id", () => {
    expect(claudeCommand(request(Option.some("sess-2"), "claude"))).toContain(
      "--resume 'sess-2'"
    );
  });
});
