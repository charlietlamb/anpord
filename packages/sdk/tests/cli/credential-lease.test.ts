import { describe, expect, it } from "bun:test";
import {
  CredentialLease,
  CredentialLeaseRequest,
  VariableLeaseRequest,
} from "@sphynx/schema/public/runner-api";
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
      authMethodId: "api-key",
      expiresAt: "2026-01-01T00:15:00Z",
      values: { apiKey: "secret" },
    });

    expect(decoded.expiresAt.epochMillis).toBeGreaterThan(0);
    expect(decoded.authMethodId).toBe("api-key");
    expect(decoded.values.apiKey).toBe("secret");
  });

  it("is refused without an expiry", () => {
    expect(() =>
      decodeLease({ authMethodId: "api-key", values: { apiKey: "secret" } })
    ).toThrow();
  });
});

describe("asking for the variables a profile names", () => {
  const decodeVariables = Schema.decodeUnknownSync(VariableLeaseRequest);

  it("names the run and the variables", () => {
    expect(decodeVariables({ id: "run_1", names: ["SEARCH_API_KEY"] })).toEqual(
      {
        id: "run_1",
        names: ["SEARCH_API_KEY"],
      }
    );
  });

  it("refuses a reserved or malformed name", () => {
    expect(() =>
      decodeVariables({ id: "run_1", names: ["SPHYNX_TOKEN"] })
    ).toThrow();
    expect(() => decodeVariables({ id: "run_1", names: ["lower"] })).toThrow();
  });
});
