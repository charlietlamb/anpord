import { describe, expect, it } from "bun:test";
import { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import { Schema } from "effect";
import { harnessesNeeded } from "../../src/domain/suite-harnesses";

const suiteWith = (cases: readonly unknown[]) =>
  Schema.decodeUnknownSync(StartBatchRequest)({
    cases,
    suite: { id: "suite", prompt: "go" },
    trials: 1,
    variants: [
      { harness: "claude", model: "sonnet" },
      { harness: "claude", model: "opus" },
    ],
  });

describe("the harnesses a suite needs", () => {
  it("adds the harness that plays the person and the harness that judges", () => {
    expect(
      harnessesNeeded(
        suiteWith([
          {
            id: "asks",
            user: {
              goal: "ship it",
              harness: "codex",
              kind: "simulated",
              model: "gpt-5.6-sol",
              prompt: "You want it shipped.",
            },
            verify: "true",
          },
          {
            id: "judged",
            validator: {
              checks: [],
              judges: [
                {
                  choices: { no: 0, yes: 1 },
                  harness: "opencode",
                  kind: "judge",
                  model: "judge-model",
                  name: "helpful",
                  prompt: "Was it helpful?",
                },
              ],
              kind: "judged",
              name: "judged",
            },
          },
        ])
      )
    ).toEqual(["claude", "codex", "opencode"]);
  });

  it("needs only the variants' harnesses when nobody else runs one", () => {
    expect(
      harnessesNeeded(
        suiteWith([
          {
            id: "scripted",
            user: { kind: "scripted", replies: ["yes"] },
            verify: "true",
          },
        ])
      )
    ).toEqual(["claude"]);
  });
});
