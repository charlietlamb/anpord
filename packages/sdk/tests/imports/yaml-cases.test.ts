import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { NodeContext } from "@effect/platform-node";
import { Effect, Exit } from "effect";
import ts from "typescript";
import { importYamlCases } from "../../src/imports/yaml-cases";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);

const imported = (name: string) =>
  Effect.runPromise(
    importYamlCases(fixture(name)).pipe(Effect.provide(NodeContext.layer))
  );

const refusal = async (name: string) => {
  const exit = await Effect.runPromiseExit(
    importYamlCases(fixture(name)).pipe(Effect.provide(NodeContext.layer))
  );

  if (Exit.isSuccess(exit)) {
    throw new Error(`${name} was imported when it should have been refused`);
  }

  return String(exit.cause);
};

/** Built rather than written, so the sequence a template literal treats as a
 * substitution never appears in this file's own source. */
const OPENS_SUBSTITUTION = `$${"{"}`;

const parseErrorsIn = (source: string) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  }).diagnostics ?? [];

describe("reading one case file", () => {
  test("takes the task, the name and every judge context line", async () => {
    const { source } = await imported("yaml-cases/checkout-flow.yaml");

    expect(source).toContain('name: "checkout-flow"');
    expect(source).toContain("complete checkout with the test card");
    expect(source).toContain(
      'unwritten("The agent must reach the basket page before paying")'
    );
    expect(source).toContain(
      'unwritten("The receipt it reports must quote the order total")'
    );
  });

  test("counts every judge context line as owed to a human", async () => {
    const { tally } = await imported("yaml-cases/checkout-flow.yaml");

    expect(tally).toEqual({ cases: 1, converted: 0, needsAuthor: 3 });
  });

  test("keeps the step budget the file declared", async () => {
    const { source } = await imported("yaml-cases/checkout-flow.yaml");

    expect(source).toContain("The file allowed 12 steps");
  });

  /** The runner reads a missing list as one generic line, so the import says
   * the case has nothing written about it rather than inventing a check. */
  test("says a case wrote no judge context, and fails it", async () => {
    const { source, tally } = await imported("yaml-unjudged.yaml");

    expect(source).toContain("named no judge context");
    expect(source).toContain("unwritten(");
    expect(tally).toEqual({ cases: 1, converted: 0, needsAuthor: 1 });
  });

  test("falls back to the runner's own step budget", async () => {
    const { source } = await imported("yaml-unjudged.yaml");

    expect(source).toContain("The file allowed 15 steps");
  });

  /** A backtick closes the generated template literal and `${` opens a
   * substitution, so a task holding either has to survive the round trip. */
  test("round-trips a task holding a backtick and a substitution", async () => {
    const { source } = await imported("yaml-substitution.yaml");

    expect(source).toContain("\\`bun test\\`");
    expect(source).toContain(`\\${OPENS_SUBSTITUTION}count}`);
    expect(parseErrorsIn(source)).toHaveLength(0);
  });
});

describe("reading a directory of case files", () => {
  test("makes one suite with one case per file, sorted", async () => {
    const { source, tally } = await imported("yaml-cases");

    expect(tally).toEqual({ cases: 3, converted: 0, needsAuthor: 5 });
    expect(source.indexOf("archive-search.yaml")).toBeLessThan(
      source.indexOf("build-check.yml")
    );
    expect(source.indexOf("build-check.yml")).toBeLessThan(
      source.indexOf("checkout-flow.yaml")
    );
  });

  test("reads both suffixes", async () => {
    const { source } = await imported("yaml-cases");

    expect(source).toContain('name: "build-check"');
    expect(source).toContain('name: "archive-search"');
  });

  test("writes a suite that parses as TypeScript", async () => {
    const { source } = await imported("yaml-cases");

    expect(parseErrorsIn(source)).toHaveLength(0);
  });
});

describe("when a file is refused", () => {
  test("names the file that is not YAML", async () => {
    const cause = await refusal("yaml-malformed.yaml");

    expect(cause).toContain("CaseFileNotYaml");
    expect(cause).toContain("yaml-malformed.yaml");
  });

  test("names the field when the shape is wrong", async () => {
    const cause = await refusal("yaml-wrong-shape.yaml");

    expect(cause).toContain("CaseFileNotYamlCase");
    expect(cause).toContain("task");
  });

  test("refuses a directory holding no case files", async () => {
    const cause = await refusal("yaml-none");

    expect(cause).toContain("CaseDirectoryEmpty");
    expect(cause).toContain("nothing to import");
  });

  test("says which file could not be read", async () => {
    const cause = await refusal("yaml-absent.yaml");

    expect(cause).toContain("CaseFileUnreadable");
    expect(cause).toContain("yaml-absent.yaml");
  });
});
