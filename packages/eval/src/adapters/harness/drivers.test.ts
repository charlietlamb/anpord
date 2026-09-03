import { describe, expect, it } from "bun:test";
import { Effect, Option } from "effect";
import type { HarnessName } from "../../domain/cell";
import type { RunHarness } from "../../ports/harness";
import { Harnesses } from "../../ports/harness";
import { claudeCommand } from "./claude";
import { codexCommand } from "./codex";
import { cursorCommand } from "./cursor";
import { fxCommand } from "./fx";
import { geminiCommand } from "./gemini";
import { opencodeCommand, opencodeRunEnv } from "./opencode";
import { piCommand } from "./pi";
import { qwenCommand } from "./qwen";
import { HarnessesLive } from "./resolve";

const harnesses: readonly HarnessName[] = [
  "codex",
  "opencode",
  "pi",
  "fx",
  "claude",
  "gemini",
  "qwen",
  "cursor",
];

const request = {
  env: {},
  harnessVersion: "1",
  model: "vendor/model'; touch /tmp/model",
  profile: Option.none(),
  prompt: "fix it's broken; touch /tmp/prompt",
  systemPromptPath: Option.none(),
  workspace: "/tmp/work space",
} as RunHarness;

describe("harness drivers", () => {
  it("registers every schema harness", async () => {
    const found = await Effect.runPromise(
      Effect.gen(function* () {
        const registry = yield* Harnesses;
        return yield* Effect.forEach([...harnesses], registry.resolve);
      }).pipe(Effect.provide(HarnessesLive))
    );

    expect(found.map((driver) => driver.harness)).toEqual([...harnesses]);
  });

  it("quotes model, prompt, and workspace arguments", () => {
    for (const command of [
      claudeCommand,
      codexCommand,
      cursorCommand,
      fxCommand,
      geminiCommand,
      opencodeCommand,
      piCommand,
      qwenCommand,
    ]) {
      const built = command(request);
      expect(built).toContain("cd '/tmp/work space'");
      expect(built).toContain("'\\''; touch /tmp/model");
      expect(built).toContain("'\\''s broken; touch /tmp/prompt'");
      expect(built).toEndWith("< /dev/null");
    }
  });
});

const SYSTEM_PROMPT = "Answer in one word.";
const PROMPT_PATH = "/home/agent/.anpord/system-prompt.md";

const withProfile = (
  files: Readonly<Record<string, string>>,
  systemPrompt: string | null = SYSTEM_PROMPT
) =>
  ({
    ...request,
    harness: "claude",
    profile: Option.some({
      env: null,
      files,
      install: null,
      name: "sample",
      run: null,
      systemPrompt,
    }),
    systemPromptPath:
      systemPrompt === null ? Option.none() : Option.some(PROMPT_PATH),
  }) as RunHarness;

describe("a profile on Claude", () => {
  it("adds nothing when the cell has no profile", () => {
    const built = claudeCommand(request);

    expect(built).not.toContain("--add-dir");
    expect(built).not.toContain("--append-system-prompt-file");
  });

  /* --bare turns off CLAUDE.md discovery, so a profile's workspace files are
     read only when the directory is named. */
  it("names the workspace directory for every profile cell", () => {
    expect(claudeCommand(withProfile({}, null))).toContain(
      "--add-dir '/tmp/work space'"
    );
  });

  it("appends the system prompt from the file the materialiser wrote", () => {
    expect(claudeCommand(withProfile({}))).toContain(
      `--append-system-prompt-file '${PROMPT_PATH}'`
    );
  });

  it("names settings and MCP config only when the profile ships them", () => {
    const bare = claudeCommand(withProfile({}));

    expect(bare).not.toContain("--settings");
    expect(bare).not.toContain("--mcp-config");

    const shipped = claudeCommand(
      withProfile({
        "workspace/.claude/settings.json": "{}",
        "workspace/.mcp.json": "{}",
      })
    );

    expect(shipped).toContain(
      "--settings '/tmp/work space/.claude/settings.json'"
    );
    expect(shipped).toContain("--mcp-config '/tmp/work space/.mcp.json'");
  });
});

describe("a profile on Codex", () => {
  it("adds the prompt as developer instructions, which are additive", () => {
    expect(codexCommand({ ...withProfile({}), harness: "codex" })).toContain(
      `-c 'developer_instructions="${SYSTEM_PROMPT}"'`
    );
  });

  it("adds nothing when the profile supplies no prompt", () => {
    expect(
      codexCommand({ ...withProfile({}, null), harness: "codex" })
    ).not.toContain("developer_instructions");
  });
});

describe("a profile on OpenCode", () => {
  it("names the prompt through the config content, not the command", () => {
    const run = { ...withProfile({}), env: {}, harness: "opencode" } as const;

    expect(opencodeRunEnv(run).OPENCODE_CONFIG_CONTENT).toBe(
      JSON.stringify({ instructions: [PROMPT_PATH] })
    );
    expect(opencodeCommand(run)).not.toContain(PROMPT_PATH);
  });

  it("leaves the environment alone when there is no prompt", () => {
    const run = {
      ...withProfile({}, null),
      env: { A: "1" },
      harness: "opencode",
    } as const;

    expect(opencodeRunEnv(run)).toEqual({ A: "1" });
  });
});

describe("a profile on a base that reads an instructions file", () => {
  const bases = [
    ["gemini", geminiCommand, "GEMINI.md"],
    ["qwen", qwenCommand, "AGENTS.md"],
    ["pi", piCommand, "AGENTS.md"],
    ["fx", fxCommand, "AGENTS.md"],
    ["cursor", cursorCommand, "AGENTS.md"],
  ] as const;

  it("prepends the prompt to the file the base discovers", () => {
    for (const [harness, command, file] of bases) {
      const built = command({ ...withProfile({}), harness });

      expect(built).toContain(`cat '${PROMPT_PATH}'`);
      expect(built).toContain(`'/tmp/work space/${file}'`);
      expect(built.indexOf("cat")).toBeLessThan(built.indexOf("cd '/tmp"));
    }
  });

  it("leaves the command untouched without a prompt", () => {
    for (const [harness, command] of bases) {
      expect(command({ ...withProfile({}, null), harness })).toStartWith(
        "cd '/tmp/work space'"
      );
    }
  });
});
