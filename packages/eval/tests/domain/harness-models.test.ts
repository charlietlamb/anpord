import { describe, expect, test } from "bun:test";
import { modelFor } from "../../src/domain/harness-models";

const credential = (authMethodId: string) => ({ authMethodId }) as never;

describe("the model a credential can be asked for", () => {
  /* A subscription picks its own and refuses any name, so asking for one is
     how a run fails after paying for a sandbox and an install. */
  test("is the credential's own when it signs in as a ChatGPT account", () => {
    expect(modelFor(credential("chatgpt"), "gpt-5.1-codex")).toBe("");
  });

  test("is the one asked for when it signs in with an api key", () => {
    expect(modelFor(credential("api-key"), "gpt-5.1-codex")).toBe(
      "gpt-5.1-codex"
    );
  });

  test("is the one asked for under any other method, which is the safe default", () => {
    expect(modelFor(credential("legacy-auth-json"), "gpt-5")).toBe("gpt-5");
  });
});
