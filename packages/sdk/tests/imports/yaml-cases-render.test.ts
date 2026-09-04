import { describe, expect, test } from "bun:test";
import ts from "typescript";
import {
  renderYamlSuite,
  tallyOf,
  type YamlCaseFile,
} from "../../src/imports/yaml-cases-render";

/** Built rather than written, so the sequence a template literal treats as a
 * substitution never appears in this file's own source. */
const OPENS_SUBSTITUTION = `$${"{"}`;

const oneCase = (
  subject: Partial<YamlCaseFile["subject"]> = {},
  path = "cases/one.yaml"
): YamlCaseFile[] => [
  {
    path,
    subject: {
      judge_context: ["The agent must reach the basket page"],
      max_steps: 15,
      name: "One Case",
      task: "Do the work.",
      ...subject,
    },
  },
];

const parseErrorsIn = (source: string) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  }).diagnostics ?? [];

describe("the generated suite", () => {
  /** Every judge_context line is prose written for a model judge, so a guess
   * at its mechanical reading would score the wrong thing. */
  test("keeps every judge context line verbatim", () => {
    const line = "The agent must use the test card, never a real one";
    const source = renderYamlSuite(oneCase({ judge_context: [line] }));

    expect(source).toContain(line);
  });

  test("leaves every judge context line failing until it is written", () => {
    const source = renderYamlSuite(
      oneCase({ judge_context: ["The agent must search rather than guess"] })
    );

    expect(source).toContain(
      "const unwritten = (_specification: string) => false;"
    );
    expect(source).toContain(
      'unwritten("The agent must search rather than guess")'
    );
  });

  test("converts nothing, and says so in the tally", () => {
    expect(tallyOf(oneCase({ judge_context: ["a", "b"] }))).toEqual({
      cases: 1,
      converted: 0,
      needsAuthor: 2,
    });
  });

  test("counts a judge context line in every file", () => {
    expect(
      tallyOf([
        ...oneCase({ judge_context: ["a"] }, "cases/one.yaml"),
        ...oneCase({ judge_context: ["b", "c"] }, "cases/two.yaml"),
      ])
    ).toEqual({ cases: 2, converted: 0, needsAuthor: 3 });
  });

  test("carries the task as the case prompt, verbatim", () => {
    const task = "Open the storefront.\nThen pay.";

    expect(renderYamlSuite(oneCase({ task }))).toContain(
      "Open the storefront.\nThen pay."
    );
  });

  /** A backtick closes the literal and `${` opens a substitution; either one
   * unescaped turns a task into code. */
  test("escapes a task holding a backtick and a substitution", () => {
    const task = `Run \`bun test\` and report ${OPENS_SUBSTITUTION}count} failures.`;
    const source = renderYamlSuite(oneCase({ task }));

    expect(source).toContain(
      `Run \\\`bun test\\\` and report \\${OPENS_SUBSTITUTION}count}`
    );
    expect(parseErrorsIn(source)).toHaveLength(0);
  });

  /** A comment terminator inside the author's text would end the comment and
   * run the rest of their sentence as code. */
  test("cannot be escaped out of a comment", () => {
    const source = renderYamlSuite(
      oneCase({ judge_context: ["closes the block */ and then some;"] })
    );

    expect(source).toContain("/* closes the block *\\/ and then some; */");
    expect(parseErrorsIn(source)).toHaveLength(0);
  });

  /** Anpord has no step budget, so dropping the number silently would lose
   * the one fact that says how much room the case had. */
  test("keeps the step budget as a note rather than a limit", () => {
    const source = renderYamlSuite(oneCase({ max_steps: 12 }));

    expect(source).toContain("The file allowed 12 steps");
    expect(source).toContain("Anpord does not cap steps");
  });

  test("names the file each case came from", () => {
    expect(renderYamlSuite(oneCase({}, "cases/checkout-flow.yaml"))).toContain(
      "/* Imported from cases/checkout-flow.yaml. */"
    );
  });

  test("names a case after the name its author gave it", () => {
    expect(renderYamlSuite(oneCase({ name: "Checkout Flow" }))).toContain(
      'name: "checkout-flow"'
    );
  });

  /** A case nobody wrote judge context for says nothing about a good answer,
   * so it fails rather than passing by default. */
  test("fails a case whose author wrote no judge context", () => {
    const source = renderYamlSuite(oneCase({ judge_context: [] }));

    expect(source).toContain(
      'unwritten("This case named no judge context. Write what a good answer is.")'
    );
    expect(parseErrorsIn(source)).toHaveLength(0);
  });

  test("names a suite of several files generically", () => {
    const source = renderYamlSuite([
      ...oneCase({ name: "One" }, "cases/one.yaml"),
      ...oneCase({ name: "Two" }, "cases/two.yaml"),
    ]);

    expect(source).toContain('name: "imported-suite"');
  });

  test("parses as TypeScript with several cases in one suite", () => {
    const source = renderYamlSuite([
      ...oneCase({ judge_context: ["a `quoted` line"] }, "cases/one.yaml"),
      ...oneCase({ judge_context: [] }, "cases/two.yaml"),
    ]);

    expect(parseErrorsIn(source)).toHaveLength(0);
  });

  test("declares one task for the author to edit", () => {
    const source = renderYamlSuite(oneCase());

    expect(source.match(/harness:/g)).toHaveLength(1);
  });
});
