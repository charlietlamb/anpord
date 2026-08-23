import { describe, expect, it } from "bun:test";
import { MCP_SCOPES } from "@anpord/schema/domain/scopes";
import { anpordOAuth, issuerOf } from "../src/oauth";

describe("issuerOf", () => {
  it.each([
    ["http://localhost:3005/api/auth", "http://localhost:3005"],
    ["https://www.anpord.com/api/auth", "https://www.anpord.com"],
  ])("normalizes %s to %s", (url, expected) => {
    expect(issuerOf(url)).toBe(expected);
  });
});

describe("OAuth scopes", () => {
  it("requests every permission used by the MCP tools", () => {
    expect(anpordOAuth.requiredScopes).toEqual([...MCP_SCOPES]);
    expect(anpordOAuth.scopesSupported).toEqual([...MCP_SCOPES]);
  });
});
