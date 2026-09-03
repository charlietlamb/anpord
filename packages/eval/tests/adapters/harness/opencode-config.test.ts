import { describe, expect, it } from "bun:test";
import { opencodeConfigContent } from "../../../src/adapters/harness/opencode-config";

const PROMPT = "/home/agent/.anpord/system-prompt.md";

const decoded = (env: Readonly<Record<string, string>>) =>
  JSON.parse(opencodeConfigContent(env, PROMPT)) as Record<string, unknown>;

describe("the OpenCode config a profile runs under", () => {
  it("names the system prompt when the profile declares nothing", () => {
    expect(decoded({})).toEqual({ instructions: [PROMPT] });
  });

  it("keeps the profile's own instructions and appends the prompt", () => {
    const config = decoded({
      OPENCODE_CONFIG_CONTENT: JSON.stringify({
        instructions: ["./AGENTS.md", "./docs/style.md"],
      }),
    });

    expect(config.instructions).toEqual([
      "./AGENTS.md",
      "./docs/style.md",
      PROMPT,
    ]);
  });

  it("deep merges every other key the profile set", () => {
    const config = decoded({
      OPENCODE_CONFIG_CONTENT: JSON.stringify({
        model: "vendor/model",
        permission: { bash: "allow", edit: "ask" },
      }),
    });

    expect(config).toEqual({
      instructions: [PROMPT],
      model: "vendor/model",
      permission: { bash: "allow", edit: "ask" },
    });
  });

  it("ignores a value that is not an object", () => {
    expect(decoded({ OPENCODE_CONFIG_CONTENT: "not json" })).toEqual({
      instructions: [PROMPT],
    });
  });
});
