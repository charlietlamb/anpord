import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { EvalLocalLive } from "../../src/local-layer";
import { HarnessVersions } from "../../src/services/harness-versions";

const SEMVER = /^\d+\.\d+\.\d+/;

const versionOf = (harness: "claude" | "codex") =>
  HarnessVersions.pipe(
    Effect.flatMap((versions) => versions.version(harness)),
    Effect.provide(EvalLocalLive),
    Effect.scoped,
    Effect.runPromise
  );

describe("the harness version a local run installs", () => {
  it.each([
    "claude",
    "codex",
  ] as const)("resolves %s to something npm can install", async (harness) => {
    const version = await versionOf(harness);

    expect(version).toMatch(SEMVER);
  }, 30_000);
});
