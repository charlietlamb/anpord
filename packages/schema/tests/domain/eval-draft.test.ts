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
  cases: [
    {
      goal: "Put the GitHub logo in the footer.",
      name: "github-logo-in-footer",
      setup: null,
      source: { kind: "empty" as const },
      verify: "test -f public/logos/github-light.svg",
    },
  ],
  models: ["gpt-5-codex"],
  name: "brand logos",
  prompt: "{{goal}}",
  providers: ["daytona" as const],
  trials: 3,
};

describe("the eval draft", () => {
  /** The form validates against the same schema the server decodes, so a
   * message written here is the message a person reads. */
  it("names what is missing in words a person can act on", () => {
    const messages = validate({
      ...draft,
      cases: [],
      models: [],
      providers: [],
    }).map((issue) => issue.message);

    expect(messages).toContain("Add at least one case.");
    expect(messages).toContain("Choose at least one model.");
    expect(messages).toContain("Choose at least one sandbox.");
  });

  /** A row's error has to land on the row, or a person with six cases is told
   * something is wrong and not which one. */
  it("points at the row that is wrong", () => {
    const paths = validate({
      ...draft,
      cases: [{ ...draft.cases[0], goal: "" }],
    }).map((issue) => issue.path);

    expect(paths).toContain("cases.0.goal");
  });

  it("refuses a trial count outside the range that can run", () => {
    const messages = validate({ ...draft, trials: 99 }).map(
      (issue) => issue.message
    );

    expect(messages).toContain("Run between 1 and 10 trials.");
  });

  /** Two axes crossed, because a column is every pairing and a person picking
   * three models against two sandboxes means six. */
  it("crosses the axes into every pairing", () => {
    const columns = columnsOfDraft({
      models: ["gpt-5-codex", "gpt-5", "gpt-5-mini"],
      providers: ["daytona", "e2b"],
    });

    expect(columns).toHaveLength(6);
    expect(new Set(columns.map((column) => column.provider))).toEqual(
      new Set(["daytona", "e2b"])
    );
  });

  /** What the form holds has to be what the server accepts, or the drift a
   * shared schema exists to prevent is back. */
  it("encodes into the request the server decodes", async () => {
    const encoded = await Effect.runPromise(
      Schema.encode(SavePlaygroundRequest)({
        config: {
          cases: draft.cases,
          columns: columnsOfDraft(draft),
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
