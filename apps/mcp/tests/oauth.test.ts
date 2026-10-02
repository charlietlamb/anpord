import { describe, expect, it } from "bun:test";
import { MCP_SCOPES } from "@sphynx/schema/domain/scopes";
import { issuerOf, sphynxOAuth } from "../src/oauth";

describe("issuerOf", () => {
  it.each([
    ["http://localhost:3005/api/auth", "http://localhost:3005"],
    ["https://www.sphynx.sh/api/auth", "https://www.sphynx.sh"],
  ])("normalizes %s to %s", (url, expected) => {
    expect(issuerOf(url)).toBe(expected);
  });
});

describe("OAuth scopes", () => {
  it("requests every permission used by the MCP tools", () => {
    expect(sphynxOAuth.requiredScopes).toEqual([...MCP_SCOPES]);
    expect(sphynxOAuth.scopesSupported).toEqual([...MCP_SCOPES]);
  });
});
