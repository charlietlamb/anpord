import { describe, expect, it } from "bun:test";
import { credentialIntegrations } from "../../src/credentials/integrations";
import { MODEL_PROVIDERS } from "../../src/domain/model-providers";

describe("the providers a case's human can run on", () => {
  it("offers every one of them as a connector", () => {
    const connectable = new Set(
      credentialIntegrations
        .filter(({ category }) => category === "model")
        .map(({ id }) => id)
    );

    for (const provider of MODEL_PROVIDERS) {
      expect(connectable.has(provider.id)).toBe(true);
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
