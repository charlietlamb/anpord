import { expect, test } from "bun:test";
import { resolveApiKeyPermissions } from "../src/http/authentication/api-key";

test("a CI key grants only its configured eval permissions", () => {
  expect(resolveApiKeyPermissions({ evals: ["read", "write"] })).toEqual([
    "evals:read",
    "evals:write",
  ]);
});

test("an explicitly empty scope grants no access", () => {
  expect(resolveApiKeyPermissions({})).toEqual([]);
});

test("keys cannot grant administrative permissions", () => {
  expect(
    resolveApiKeyPermissions({
      organization: ["admin"],
      credentials: ["write"],
    })
  ).toEqual([]);
});

test("legacy keys retain their existing permissions", () => {
  expect(resolveApiKeyPermissions(null)).toContain("prompts:write");
});
