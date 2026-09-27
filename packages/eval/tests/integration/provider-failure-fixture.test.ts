import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("./provider-failure.test.ts", import.meta.url)),
  "utf8"
);

describe("provider-failure.test.ts checks credentials the same way every other integration test does", () => {
  it("imports its readiness flags from the shared fixture", () => {
    expect(source).toContain('from "../fixtures/credentials"');
  });

  it("does not compute its own env-based readiness formula", () => {
    expect(source).not.toMatch(/process\.env\.[A-Z_]+_API_KEY/);
    expect(source).not.toContain("CLOUDFLARE_SANDBOX_URL");
  });
});
