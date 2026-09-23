import { describe, expect, it } from "bun:test";
import {
  changesBetween,
  type DefinitionFields,
} from "../../src/domain/definition-changes";

const base: DefinitionFields = {
  prepareSource: null,
  repoRef: null,
  repoUrl: null,
  sourceFiles: { "a.txt": "one" },
  sourceKind: "files",
  user: null,
  validatorConfig: { name: "validate", source: "v1" },
  validatorSource: "v1",
  verifyCommand: null,
};

describe("what changed between two versions of a case", () => {
  it("names nothing when the definition is the same", () => {
    expect(changesBetween(base, { ...base })).toEqual([]);
  });

  it("names each part that moved, in a fixed order", () => {
    expect(
      changesBetween(base, {
        ...base,
        sourceFiles: { "a.txt": "two" },
        validatorConfig: { name: "validate", source: "v2" },
        validatorSource: "v2",
      })
    ).toEqual(["source", "validator"]);
  });

  it("names the simulated user and the setup", () => {
    expect(
      changesBetween(base, {
        ...base,
        prepareSource: "install()",
        user: { goal: "go live", kind: "simulated", prompt: "p" },
      })
    ).toEqual(["setup", "simulated user"]);
  });
});
