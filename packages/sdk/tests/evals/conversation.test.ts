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

  test("takes a script when the ordering is the point", () => {
    expect(script(["yes, go ahead"])).toMatchObject({
      kind: "scripted",
      replies: ["yes, go ahead"],
    });
  });
});
