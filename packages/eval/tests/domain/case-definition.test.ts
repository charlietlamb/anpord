import { describe, expect, it } from "bun:test";
import { EvalCase } from "@anpord/schema/domain/eval-definition";
import { Schema } from "effect";
import { caseDefinitionOf } from "../../src/domain/case-definition";

const subject = (variables: Readonly<Record<string, string>>) =>
  Schema.decodeUnknownSync(EvalCase)({
    id: "fixture",
    variables,
  });

describe("building the case a trial runs", () => {
  it("renders the suite prompt against the case's variables", () => {
    const definition = caseDefinitionOf(
      { prompt: "fix: {{task}}" },
      subject({ task: "the parser" })
    );

    expect(definition.prompt).toBe("fix: the parser");
  });

  it("carries the case's prepare, source, user, validator and verify through unchanged", () => {
    const decoded = Schema.decodeUnknownSync(EvalCase)({
      id: "fixture",
      prepare: { name: "setup", source: "export {}" },
      source: { files: { "a.txt": "one" }, kind: "files" },
      verify: "test -f a.txt",
    });

    const definition = caseDefinitionOf({ prompt: "do it" }, decoded);

    expect(definition.prepare).toEqual({ name: "setup", source: "export {}" });
    expect(definition.source).toEqual({
      files: { "a.txt": "one" },
      kind: "files",
    });
    expect(definition.verify).toBe("test -f a.txt");
  });
});
