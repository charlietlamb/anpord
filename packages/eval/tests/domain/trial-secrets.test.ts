import { describe, expect, it } from "bun:test";
import { Redacted } from "effect";
import { unkeyed } from "../../src/credentials/variants";
import { trialSecrets } from "../../src/domain/trial-secrets";

const WEBHOOK = "https://hooks.example.com/services/T000/B000/abcdefghij";

describe("what a trial scrubs from its journal", () => {
  it("scrubs a named variable whole, even one shaped like an address", () => {
    const secrets = trialSecrets({
      harnessCredential: unkeyed(),
      variables: Redacted.make({ SLACK_WEBHOOK_URL: WEBHOOK }),
    });

    expect(secrets).toContain(WEBHOOK);
  });
});
