/**
 * The fixture every integration test runs against.
 *
 * Plain ESM run by `node --test`, because that is the only toolchain both
 * providers actually ship: Daytona carries bun and node 25, E2B carries node
 * 20 and no bun. Writing the fixture in bun made a passing task fail on E2B,
 * which is a finding about the provider axis rather than a broken test, and
 * exactly the kind of difference this product exists to surface.
 *
 * The bug is deliberate and small: an off-by-one an agent can find by reading
 * the failure. The point of the fixture is not difficulty. It is that a
 * verifier which cannot tell the broken version from the fixed one is broken
 * itself, and that is what the bracket checks.
 */
export const BROKEN_SOURCE =
  "export const total = (items) => items.reduce((sum, item) => sum + item, 0) - 1;\n";

export const FIXED_SOURCE =
  "export const total = (items) => items.reduce((sum, item) => sum + item, 0);\n";

export const TEST_SOURCE = [
  'import assert from "node:assert/strict";',
  'import { test } from "node:test";',
  'import { total } from "./total.mjs";',
  "",
  'test("total sums its items", () => {',
  "  assert.equal(total([1, 2, 3]), 6);",
  "});",
  "",
].join("\n");

/** Node is already on both images, so there is no setup step: an install that
 * takes a minute would dominate the timing of a trial that takes seconds. */
export const SETUP_COMMAND: string | null = null;

/** Unpiped on purpose. A pipeline exits with its last command, so piping this
 * through `tail` reports the success of tail while the runner exits 1. */
export const VERIFY_COMMAND = "node --test 2>&1";

const named = (source: string): Readonly<Record<string, string>> => ({
  "total.mjs": source,
  "total.test.mjs": TEST_SOURCE,
});

export const brokenFiles = named(BROKEN_SOURCE);

export const AGENT_PROMPT =
  "the test fails, fix total.mjs so it passes. do not edit the test.";
