#!/usr/bin/env bun

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BRAND_ASSETS } from "../packages/ui/src/lib/brand.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

for (const [path, svg] of Object.entries(BRAND_ASSETS)) {
  writeFileSync(`${root}${path}`, svg);
  console.log(`wrote ${path}`);
}
