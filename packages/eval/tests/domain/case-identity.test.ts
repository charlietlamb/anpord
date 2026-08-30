import { describe, expect, it } from "bun:test";
import {
  type CaseDefinition,
  caseIdentityOf,
} from "../../src/domain/case-identity";

const base: CaseDefinition = {
  goal: "add the GitHub logo to the footer",
  name: "brand-logos",
  setupCommand: null,
  source: { files: { "a.txt": "one" }, kind: "files" },
  verifyCommand: "test -f public/logos/github-light.svg",
  workspace: "/tmp/anpord-task",
};

describe("case identity", () => {
  it("is stable for the same case", () => {
    expect(caseIdentityOf(base)).toBe(caseIdentityOf({ ...base }));
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

    expect(caseIdentityOf(other)).toBe(caseIdentityOf(withPrompt));
  });

  it("changes when the goal changes", () => {
    expect(caseIdentityOf({ ...base, goal: "something else" })).not.toBe(
      caseIdentityOf(base)
    );
  });

  /** Editing a verifier means measuring a different thing, so the old
   * readings stay attached to the old identity rather than being compared
   * across a moved goalpost. */
  it("changes when the verifier changes", () => {
    expect(
      caseIdentityOf({ ...base, verifyCommand: "test -f other.svg" })
    ).not.toBe(caseIdentityOf(base));
  });

  it("changes when the validator changes", () => {
    expect(
      caseIdentityOf({
        ...base,
        validator: { name: "validate", source: "new source" },
      })
    ).not.toBe(caseIdentityOf(base));
  });

  it("changes when the source changes", () => {
    expect(
      caseIdentityOf({
        ...base,
        source: { files: { "a.txt": "two" }, kind: "files" },
      })
    ).not.toBe(caseIdentityOf(base));
  });

  /** Two identical fixtures written in a different order are one case. */
  it("ignores the order files were written in", () => {
    const first = caseIdentityOf({
      ...base,
      source: { files: { "a.txt": "one", "b.txt": "two" }, kind: "files" },
    });

    const second = caseIdentityOf({
      ...base,
      source: { files: { "b.txt": "two", "a.txt": "one" }, kind: "files" },
    });

    expect(second).toBe(first);
  });
});
