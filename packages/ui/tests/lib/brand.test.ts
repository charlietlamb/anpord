import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BRAND_ASSETS, MARK_PATH } from "@sphynx/ui/lib/brand";

const root = fileURLToPath(new URL("../../../../", import.meta.url));

describe("brand assets", () => {
  for (const [path, svg] of Object.entries(BRAND_ASSETS)) {
    test(`${path} matches the shared mark, run bun run brand if it drifted`, () => {
      expect(readFileSync(`${root}${path}`, "utf8")).toBe(svg);
    });
  }

  test("every asset draws the one mark", () => {
    for (const svg of Object.values(BRAND_ASSETS)) {
      expect(svg).toContain(MARK_PATH);
    }
  });
});
