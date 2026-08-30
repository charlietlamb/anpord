import { describe, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { defineEval, sourceOf } from "../../src/sdk/define";
import {
  empty,
  files,
  repo,
  resolveSource,
  resolveSources,
} from "../../src/sdk/source";

const definition = defineEval({
  cases: [],
  name: "suite",
  prompt: "{{goal}}",
  scorers: [],
  source: repo("acme/widgets@a1b2c3d"),
  variants: [],
});

const subject = (source?: ReturnType<typeof repo>) => ({
  goal: "do the thing",
  name: "a case",
  ...(source === undefined ? {} : { source }),
});

describe("what a case works on", () => {
  test("a case with no source of its own uses the suite's", () => {
    expect(sourceOf(definition, subject())).toEqual(
      repo("acme/widgets@a1b2c3d")
    );
  });

  test("a case may name its own", () => {
    expect(sourceOf(definition, subject(repo("acme/other")))).toEqual(
      repo("acme/other")
    );
  });

  test("a suite with no source leaves a case with nothing", () => {
    const bare = defineEval({ ...definition, source: undefined });

    expect(sourceOf(bare, subject())).toEqual(empty);
  });
});

describe("resolveSource", () => {
  test("expands a repository into the url and ref the runner clones", async () => {
    const resolved = await Effect.runPromise(
      resolveSource(repo("acme/widgets@a1b2c3d"))
    );

    expect(resolved).toEqual({
      kind: "repo",
      ref: "a1b2c3d",
      url: "https://github.com/acme/widgets.git",
    });
  });

  test("carries inline files through unchanged", async () => {
    const resolved = await Effect.runPromise(
      resolveSource(files({ "a.ts": "export const a = 1;" }))
    );

    expect(resolved).toEqual({
      files: { "a.ts": "export const a = 1;" },
      kind: "files",
    });
  });

  test("a repository nobody could read fails before a sandbox opens", async () => {
    const exit = await Effect.runPromiseExit(resolveSource(repo("acme")));

    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe("resolveSources", () => {
  test("reports every unreadable source, not only the first", async () => {
    const exit = await Effect.runPromiseExit(
      resolveSources([
        { source: repo("acme/widgets") },
        { source: repo("acme") },
        { source: repo("") },
      ])
    );

    expect(Exit.isFailure(exit)).toBe(true);
    expect(JSON.stringify(exit)).toContain('"acme"');
    expect(JSON.stringify(exit)).toContain('"spec":""');
  });
});
