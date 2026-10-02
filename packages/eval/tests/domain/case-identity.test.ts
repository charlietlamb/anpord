import { describe, expect, it } from "bun:test";
import { EvalValidator } from "@sphynx/schema/domain/eval-definition";
import { Schema } from "effect";
import {
  type CaseDefinition,
  definitionHashOf,
} from "../../src/domain/case-identity";

const base: CaseDefinition = {
  cache: null,
  maxTurns: null,
  prepare: null,
  prompt: "add the GitHub logo to the footer",
  source: { files: { "a.txt": "one" }, kind: "files" },
  timeoutMs: null,
  user: null,
  validator: null,
  verify: "test -f public/logos/github-light.svg",
};

const judged = (model: string, prompt: string) =>
  Schema.decodeUnknownSync(EvalValidator)({
    checks: [],
    judges: [
      {
        choices: { correct: 1, incorrect: 0 },
        kind: "judge",
        model,
        name: "correctness",
        prompt,
        provider: "openai",
      },
    ],
    kind: "judged",
    name: "answer",
  });

describe("case identity", () => {
  it("is stable for the same case", () => {
    expect(definitionHashOf(base)).toBe(definitionHashOf({ ...base }));
  });

  it("does not change when only the validator's source snapshot changes", () => {
    const validator = judged("model", "Correct answer");

    expect(definitionHashOf({ ...base, validator })).toBe(
      definitionHashOf({
        ...base,
        validator: {
          ...validator,
          sourceFiles: [{ content: "export {}", path: "judge.ts" }],
        },
      })
    );
  });

  it("changes when the judge model or prompt changes", () => {
    const identity = (model: string, prompt: string) =>
      definitionHashOf({ ...base, validator: judged(model, prompt) });

    expect(identity("one", "accurate")).not.toBe(identity("two", "accurate"));
    expect(identity("one", "accurate")).not.toBe(identity("one", "concise"));
  });

  it("changes when the prompt changes", () => {
    expect(
      definitionHashOf({ ...base, prompt: "work fast, read nothing" })
    ).not.toBe(definitionHashOf(base));
  });

  it("changes when the verifier changes", () => {
    expect(definitionHashOf({ ...base, verify: "test -f other.svg" })).not.toBe(
      definitionHashOf(base)
    );
  });

  it("changes when the validator changes", () => {
    expect(
      definitionHashOf({
        ...base,
        validator: { name: "validate", source: "new source" },
      })
    ).not.toBe(definitionHashOf(base));
  });

  it("changes when the setup changes", () => {
    expect(
      definitionHashOf({
        ...base,
        prepare: { name: "prepare", source: "export const prepare = 1" },
      })
    ).not.toBe(definitionHashOf(base));
  });

  it("changes when the simulated user changes", () => {
    expect(
      definitionHashOf({
        ...base,
        user: { goal: "go live", kind: "simulated", prompt: "p" },
      })
    ).not.toBe(definitionHashOf(base));
  });

  it("changes when the cache changes", () => {
    expect(
      definitionHashOf({
        ...base,
        cache: { key: "deps", path: "node_modules" },
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
    expect(
      definitionHashOf({
        ...base,
        source: { kind: "repo", ref: null, url: "https://github.com/a/b" },
      })
    ).not.toBe(definitionHashOf(base));
  });

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

  it("changes when the harness or model playing the person changes", () => {
    const person = { goal: "go live", kind: "simulated", prompt: "p" } as const;
    const through = (harness: "codex" | "claude", model: string) =>
      definitionHashOf({ ...base, user: { ...person, harness, model } });

    expect(through("codex", "gpt-5.6-luna")).not.toBe(
      definitionHashOf({ ...base, user: person })
    );
    expect(through("codex", "gpt-5.6-luna")).not.toBe(
      through("codex", "gpt-5.6-sol")
    );
    expect(through("codex", "gpt-5.6-luna")).not.toBe(
      through("claude", "gpt-5.6-luna")
    );
  });

  it("keeps the hash a case had before limits existed when it sets none", () => {
    expect(definitionHashOf(base)).toBe("96d071e2e04fa3cedb2804a98837f02b");
  });

  it("changes when the turn or time limit changes", () => {
    const limited = (maxTurns: number | null, timeoutMs: number | null) =>
      definitionHashOf({ ...base, maxTurns, timeoutMs });

    expect(limited(3, null)).not.toBe(definitionHashOf(base));
    expect(limited(null, 60_000)).not.toBe(definitionHashOf(base));
    expect(limited(3, null)).not.toBe(limited(4, null));
    expect(limited(3, null)).not.toBe(limited(null, 3));
  });

  it("does not change when a case is retagged or renamed", () => {
    const labelled = { ...base, name: "renamed", tags: ["billing"] };

    expect(definitionHashOf(labelled)).toBe(definitionHashOf(base));
  });
});
