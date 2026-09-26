import { describe, expect, test } from "bun:test";
import { compileDefinition } from "../../src/evals/compiler";
import { human, script } from "../../src/validators";
import { conversation } from "./fixtures/conversation.eval";

describe("a case that states a user", () => {
  test("carries it through the wire contract", async () => {
    const request = await compileDefinition(conversation);

    expect(request.cases[0]?.user).toMatchObject({
      kind: "simulated",
      goal: "Get Pro live, not just written to a file.",
    });
  });

  test("states the person, never the model that plays them", () => {
    expect(() =>
      human({ goal: "g", prompt: "p", model: "gpt-4" } as never)
    ).toThrow();
  });

  test("names a harness and model to play the person through", () => {
    expect(
      human({
        goal: "g",
        prompt: "p",
        harness: "codex",
        model: "gpt-5.6-luna",
      })
    ).toEqual({
      kind: "simulated",
      goal: "g",
      prompt: "p",
      harness: "codex",
      model: "gpt-5.6-luna",
    });
    expect(() =>
      human({ goal: "g", prompt: "p", harness: "codex" } as never)
    ).toThrow();
    expect(() =>
      human({
        goal: "g",
        prompt: "p",
        harness: "command",
        model: "m",
      } as never)
    ).toThrow();
  });

  test("takes a script when the ordering is the point", () => {
    expect(script(["yes, go ahead"])).toMatchObject({
      kind: "scripted",
      replies: ["yes, go ahead"],
    });
  });
});
