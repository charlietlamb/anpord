import { describe, expect, it } from "bun:test";
import {
  columnsOfDraft,
  draftOfConfig,
  type PlaygroundConfigView,
} from "../../src/domain/evals";

const config = (
  columns: readonly {
    harness: "codex" | "opencode";
    model: string;
    provider: "daytona" | "e2b";
  }[]
): typeof PlaygroundConfigView.Type =>
  ({
    cases: [
      {
        variables: { task: "do the thing" },
        name: "a case",
        setup: null,
        source: { kind: "empty" },
        verify: "true",
      },
    ],
    columns,
    connections: {
      codex: "credential-codex",
      daytona: "credential-daytona",
    },
    prompt: "{{task}}",
    trials: 3,
  }) as typeof PlaygroundConfigView.Type;

describe("reading a saved eval back as a draft", () => {
  it("keeps the case, the prompt and the trials", () => {
    const draft = draftOfConfig(
      config([{ harness: "codex", model: "a", provider: "daytona" }]),
      "My eval"
    );

    expect(draft.name).toBe("My eval");
    expect(draft.prompt).toBe("{{task}}");
    expect(draft.trials).toBe(3);
    expect(draft.connections).toEqual({
      codex: "credential-codex",
      daytona: "credential-daytona",
    });
    expect(draft.cases[0]?.variables.task).toBe("do the thing");
  });

  it("reads each agent and provider once", () => {
    const draft = draftOfConfig(
      config([
        { harness: "codex", model: "a", provider: "daytona" },
        { harness: "codex", model: "b", provider: "daytona" },
        { harness: "codex", model: "a", provider: "e2b" },
        { harness: "codex", model: "b", provider: "e2b" },
      ]),
      "grid"
    );

    expect(draft.agents).toEqual([
      { harness: "codex", model: "a" },
      { harness: "codex", model: "b" },
    ]);
    expect(draft.providers).toEqual(["daytona", "e2b"]);
  });

  it("survives a round trip unchanged", () => {
    const columns = columnsOfDraft({
      agents: [
        { harness: "codex", model: "a" },
        { harness: "opencode", model: "b" },
      ],
      providers: ["daytona"],
    });

    const draft = draftOfConfig(config(columns), "grid");

    expect(columnsOfDraft(draft)).toEqual(columns);
  });
});
