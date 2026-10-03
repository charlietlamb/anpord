import { describe, expect, it } from "bun:test";
import { MODEL_PROVIDERS } from "../../src/domain/model-providers";
import { VARIABLE_CREDENTIALS } from "../../src/environment/variable-credentials";

const API_KEY_NAME = /_API_KEY$/;

describe("the providers a case's human can run on", () => {
  it("names a variable that unlocks every one of them", () => {
    for (const provider of MODEL_PROVIDERS) {
      expect(VARIABLE_CREDENTIALS[provider.id]?.fields[0]?.variable).toMatch(
        API_KEY_NAME
      );
    }
  });

  /* The path is appended to this, so a trailing slash asks the provider for
     //chat/completions and it answers 404. */
  it("states a base url a request can be built on", () => {
    for (const provider of MODEL_PROVIDERS) {
      expect(provider.baseUrl.startsWith("https://")).toBe(true);
      expect(provider.baseUrl.endsWith("/")).toBe(false);
    }
  });

  it("names each provider once", () => {
    const ids = MODEL_PROVIDERS.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
