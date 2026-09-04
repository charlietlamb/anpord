import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { NodeContext } from "@effect/platform-node";
import { Effect, Exit } from "effect";
import { importEvalsJson } from "../../src/imports/evals-json";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);

const imported = (name: string) =>
  Effect.runPromise(
    importEvalsJson(fixture(name)).pipe(Effect.provide(NodeContext.layer))
  );

const refusal = async (name: string) => {
  const exit = await Effect.runPromiseExit(
    importEvalsJson(fixture(name)).pipe(Effect.provide(NodeContext.layer))
  );

  if (Exit.isSuccess(exit)) {
    throw new Error(`${name} was imported when it should have been refused`);
  }

  return exit.cause;
};

describe("reading a case file", () => {
  test("takes both dialects from one file", async () => {
    const { source } = await imported("both-dialects.json");

    expect(source).toContain('answerContainsAll(["--legacy", "removed"])');
    expect(source).toContain('answerContainsAny(["migrate", "migration"])');
    expect(source).toContain('answerContainsNone(["v9.0.0"])');
  });

  /** The honest headline: three prose assertions across two cases, and the
   * structured ones counted apart from them. */
  test("counts what converted apart from what did not", async () => {
    const { tally } = await imported("both-dialects.json");

    expect(tally).toEqual({ cases: 3, converted: 4, needsAuthor: 3 });
  });

  test("refuses a file with no cases, rather than writing an empty suite", async () => {
    expect(String(await refusal("no-cases.json"))).toContain(
      "declares no cases"
    );
  });

  test("refuses a file that is not JSON", async () => {
    const cause = String(await refusal("not-json.json"));

    expect(cause).toContain("CaseFileNotJson");
    expect(cause).toContain("is not JSON");
  });

  /** A path into the decoded value tells the author nothing; the id is what
   * they search their file for. */
  test("names the offending case and field when the shape is wrong", async () => {
    const cause = String(await refusal("wrong-shape.json"));

    expect(cause).toContain("CaseFileNotEvalsJson");
    expect(cause).toContain("case 47");
    expect(cause).toContain("prompt");
  });

  test("says which file could not be read", async () => {
    const cause = String(await refusal("absent.json"));

    expect(cause).toContain("CaseFileUnreadable");
    expect(cause).toContain("absent.json");
  });
});
