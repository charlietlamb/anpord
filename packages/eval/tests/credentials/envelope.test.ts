import { describe, expect, it } from "bun:test";
import {
  deriveEnvelopeKey,
  openEnvelope,
  sealEnvelope,
} from "../../src/credentials/envelope";

describe("envelope", () => {
  it("opens what it sealed", async () => {
    const key = await deriveEnvelopeKey("secret");
    const sealed = await sealEnvelope(key, "value", "context");

    expect(await openEnvelope(key, sealed, "context")).toBe("value");
  });

  it("rejects a sealed value with a trailing segment", async () => {
    const key = await deriveEnvelopeKey("secret");
    const sealed = await sealEnvelope(key, "value", "context");

    await expect(
      openEnvelope(key, `${sealed}.extra`, "context")
    ).rejects.toThrow("Invalid envelope");
  });
});
