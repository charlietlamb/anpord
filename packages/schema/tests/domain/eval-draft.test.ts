import { describe, expect, it } from "bun:test";
import { Effect, Schema } from "effect";
import {
  columnsOfDraft,
  EvalDraft,
  SavePlaygroundRequest,
} from "../../src/domain/evals";

const validate = (value: unknown) => {
  const std = Schema.standardSchemaV1(EvalDraft) as never as {
    "~standard": {
      validate: (v: unknown) => {
        issues?: readonly { message: string; path?: readonly unknown[] }[];
      };
    };
  };

  return (std["~standard"].validate(value).issues ?? []).map((issue) => ({
    message: issue.message,
    path: (issue.path ?? []).join("."),
  }));
};

const draft = {
  agents: [{ harness: "codex" as const, model: "gpt-5-codex" }],
  cases: [
    {
      variables: { task: "Put the GitHub logo in the footer." },
      name: "github-logo-in-footer",
      setup: null,
      source: { kind: "empty" as const },
      verify: "test -f public/logos/github-light.svg",
    },
  ],
  connections: {},
  name: "brand logos",
  prompt: "{{task}}",
  providers: ["daytona" as const],
  trials: 3,
};

describe("the eval draft", () => {
  it("names what is missing in words a person can act on", () => {
    const messages = validate({
      ...draft,
      agents: [],
      cases: [],
      providers: [],
    }).map((issue) => issue.message);

    expect(messages).toContain("Add at least one case.");
    expect(messages).toContain("Choose at least one agent.");
    expect(messages).toContain("Choose at least one sandbox.");
  });

  it("points at the row that is wrong", () => {
    const paths = validate({
      ...draft,
      cases: [{ ...draft.cases[0], variables: { task: "" } }],
    }).map((issue) => issue.path);

    expect(paths).toContain("cases.0.variables");
  });

  it("refuses a trial count outside the range that can run", () => {
    const messages = validate({ ...draft, trials: 99 }).map(
      (issue) => issue.message
    );

    expect(messages).toContain("Run between 1 and 10 trials.");
  });

  it("crosses the axes into every pairing", () => {
    const columns = columnsOfDraft({
      agents: [
        { harness: "codex", model: "gpt-5-codex" },
        { harness: "opencode", model: "openai/gpt-5" },
        { harness: "gemini", model: "gemini-2.5-pro" },
      ],
      providers: ["daytona", "e2b", "upstash", "modal", "cloudflare", "vercel"],
    });

    expect(columns).toHaveLength(18);
    expect(new Set(columns.map((column) => column.provider))).toEqual(
      new Set(["daytona", "e2b", "upstash", "modal", "cloudflare", "vercel"])
    );
  });

  it("encodes into the request the server decodes", async () => {
    const encoded = await Effect.runPromise(
      Schema.encode(SavePlaygroundRequest)({
        config: {
          cases: draft.cases,
          columns: columnsOfDraft(draft),
          connections: draft.connections,
          prompt: draft.prompt,
          trials: draft.trials,
        },
        name: draft.name,
      })
    );

    expect(encoded.config.columns).toHaveLength(1);
    expect(encoded.config.cases[0]?.verify).toBe(
      "test -f public/logos/github-light.svg"
    );
  });
});
