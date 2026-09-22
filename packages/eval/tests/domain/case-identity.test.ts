import { describe, expect, it } from "bun:test";
import { EvalValidator } from "@anpord/schema/domain/evals";
import { Schema } from "effect";
import {
  type CaseDefinition,
  definitionHashOf,
} from "../../src/domain/case-identity";

const base: CaseDefinition = {
  name: "brand-logos",
  prepare: null,
  source: { files: { "a.txt": "one" }, kind: "files" },
  variables: { task: "add the GitHub logo to the footer" },
  verifyCommand: "test -f public/logos/github-light.svg",
  workspace: "/tmp/anpord-task",
};

describe("case identity", () => {
  it("does not change when only the source snapshot changes", () => {
    const validator = Schema.decodeUnknownSync(EvalValidator)({
      kind: "judged",
      name: "answer",
      checks: [],
      judges: [
        {
          kind: "judge",
          name: "correct",
          provider: "openai",
          model: "model",
          prompt: "Correct answer",
          choices: { correct: 1, incorrect: 0 },
        },
      ],
    });
    expect(definitionHashOf({ ...base, validator })).toBe(
      definitionHashOf({
        ...base,
        validator: {
          ...validator,
          sourceFiles: [{ path: "judge.ts", content: "// comment" }],
        },
      })
    );
  });
  it("changes when the judge model or prompt changes", () => {
    const identity = (model: string, prompt: string) =>
      definitionHashOf({
        ...base,
        validator: Schema.decodeUnknownSync(EvalValidator)({
          kind: "judged",
          name: "answer",
          checks: [],
          judges: [
            {
              kind: "judge",
              name: "correctness",
              provider: "openai",
              model,
              prompt,
              choices: { correct: 1, incorrect: 0 },
            },
          ],
        }),
      });
    expect(identity("one", "accurate")).not.toBe(identity("two", "accurate"));
    expect(identity("one", "accurate")).not.toBe(identity("one", "concise"));
  });
  it("is stable for the same case", () => {
    expect(definitionHashOf(base)).toBe(definitionHashOf({ ...base }));
  });

  /** The property the whole comparison rests on. A prompt is the thing under
   * test, not part of what is being asked: hashing it made every prompt edit
   * a new case, so a promoted baseline could never be measured against the
   * next prompt and the one question customers have was unanswerable. */
  it("does not change when the prompt changes", () => {
    const withPrompt = { ...base } as CaseDefinition & { prompt?: string };
    const other = {
      ...base,
      prompt: "work fast, read nothing",
    } as typeof withPrompt;

    expect(definitionHashOf(other)).toBe(definitionHashOf(withPrompt));
  });

  it("changes when the goal changes", () => {
    expect(
      definitionHashOf({ ...base, variables: { task: "something else" } })
    ).not.toBe(definitionHashOf(base));
  });

  /** Editing a verifier means measuring a different thing, so the old
   * readings stay attached to the old identity rather than being compared
   * across a moved goalpost. */
  it("changes when the verifier changes", () => {
    expect(
      definitionHashOf({ ...base, verifyCommand: "test -f other.svg" })
    ).not.toBe(definitionHashOf(base));
  });

  it("changes when the validator changes", () => {
    expect(
      definitionHashOf({
        ...base,
        validator: { name: "validate", source: "new source" },
      })
    ).not.toBe(definitionHashOf(base));
  });

  it("changes when the source changes", () => {
    expect(
      definitionHashOf({
        ...base,
        source: { files: { "a.txt": "two" }, kind: "files" },
      })
    ).not.toBe(definitionHashOf(base));
  });

  /** Two identical fixtures written in a different order are one case. */
  it("ignores the order files were written in", () => {
    const first = definitionHashOf({
      ...base,
      source: { files: { "a.txt": "one", "b.txt": "two" }, kind: "files" },
    });

    const second = definitionHashOf({
      ...base,
      source: { files: { "b.txt": "two", "a.txt": "one" }, kind: "files" },
    });

    expect(second).toBe(first);
  });

  /* Grouping is not measurement. If tags reached the hash, retagging a case
     would orphan the baseline behind it. */
  it("does not change when a case is retagged", () => {
    const untagged = definitionHashOf(base);
    const tagged = definitionHashOf({
      ...base,
      tags: ["billing", "regression"],
    } as CaseDefinition);

    expect(tagged).toBe(untagged);
  });

  it("is unchanged by the name a case carries", () => {
    expect(definitionHashOf({ ...base, name: "renamed" })).toBe(
      definitionHashOf(base)
    );
  });
});
