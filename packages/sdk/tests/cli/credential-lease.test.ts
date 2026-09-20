import { describe, expect, it } from "bun:test";
import {
  CredentialLease,
  CredentialLeaseRequest,
} from "@anpord/schema/public/evals-api";
import { Schema } from "effect";

const decodeRequest = Schema.decodeUnknownSync(CredentialLeaseRequest);
const decodeLease = Schema.decodeUnknownSync(CredentialLease);

describe("asking for the credentials a local run needs", () => {
  it("names the run and the harness", () => {
    const decoded = decodeRequest({ harness: "codex", id: "run_1" });

    expect(decoded.harness).toBe("codex");
    expect(decoded.id).toBe("run_1");
  });

  it.each([
    "e2b",
    "daytona",
    "modal",
    "vercel",
    "cloudflare",
    "upstash",
  ])("cannot name %s, which is a sandbox rather than a harness", (sandbox) => {
    expect(() => decodeRequest({ harness: sandbox, id: "run_1" })).toThrow();
  });
});

describe("what a lease carries", () => {
  it("expires, so it is held rather than kept", () => {
    const decoded = decodeLease({
      expiresAt: "2026-01-01T00:15:00Z",
      values: { apiKey: "secret" },
    });

    expect(decoded.expiresAt.epochMillis).toBeGreaterThan(0);
    expect(decoded.values.apiKey).toBe("secret");
  });

  it("is refused without an expiry", () => {
    expect(() => decodeLease({ values: { apiKey: "secret" } })).toThrow();
  });
});
