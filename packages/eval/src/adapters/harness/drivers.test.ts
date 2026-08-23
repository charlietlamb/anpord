import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { HarnessName } from "../../domain/cell";
import type { RunHarness } from "../../ports/harness";
import { Harnesses } from "../../ports/harness";
import { claudeCommand } from "./claude";
import { codexCommand } from "./codex";
import { cursorCommand } from "./cursor";
import { fxCommand } from "./fx";
import { geminiCommand } from "./gemini";
import { opencodeCommand } from "./opencode";
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
  prompt: "fix it's broken; touch /tmp/prompt",
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
