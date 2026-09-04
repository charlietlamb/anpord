import { describe, expect, test } from "bun:test";
import ts from "typescript";
import { renderEvalSuite, tallyOf } from "../../src/imports/evals-json-render";
import type { EvalsJsonFile } from "../../src/imports/evals-json-schema";

const suiteOf = (evals: EvalsJsonFile["evals"]): EvalsJsonFile => ({
  evals,
  skill_name: "release notes",
});

const oneCase = (
  assertions: EvalsJsonFile["evals"][number]["assertions"],
  rest: Partial<EvalsJsonFile["evals"][number]> = {}
) =>
  suiteOf([{ assertions, files: [], id: 1, prompt: "Do the work.", ...rest }]);

/** Built rather than written, so the sequence a template literal treats as a
 * substitution never appears in this file's own source. */
const OPENS_SUBSTITUTION = `$${"{"}`;

const parseErrorsIn = (source: string) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  }).diagnostics ?? [];

describe("the generated suite", () => {
  test("converts each structured kind to its scorer", () => {
    const source = renderEvalSuite(
      oneCase([
        { kind: "content_contains_any", needles: ["a", "b"], text: "any" },
        { kind: "content_contains_all", needles: ["c"], text: "all" },
        { kind: "content_contains_none", needles: ["d"], text: "none" },
      ])
    );

    expect(source).toContain('answerContainsAny(["a", "b"])');
    expect(source).toContain('answerContainsAll(["c"])');
    expect(source).toContain('answerContainsNone(["d"])');
  });

  test("imports only the scorers it used", () => {
    const source = renderEvalSuite(
      oneCase([{ kind: "content_contains_any", needles: ["a"], text: "any" }])
    );

    expect(source).toContain(
      'import { defineEval, files, answerContainsAny } from "anpord";'
    );
  });

  /** The author's own words are the specification for the check that replaces
   * the placeholder, so they have to survive whole. */
  test("keeps a prose assertion verbatim", () => {
    const prose = "It says why the change was made, not only what changed.";

    expect(renderEvalSuite(oneCase([prose]))).toContain(prose);
  });

  /** A guess would produce a green suite measuring the wrong thing, so an
   * unconverted assertion scores zero until a person replaces it. */
  test("leaves a prose assertion failing until it is written", () => {
    const source = renderEvalSuite(
      oneCase(["Reads like a maintainer wrote it."])
    );

    expect(source).toContain("score: 0,");
    expect(source).toContain('unwritten("Reads like a maintainer wrote it.")');
  });

  test("adds no placeholder when every assertion converted", () => {
    const source = renderEvalSuite(
      oneCase([{ kind: "content_contains_all", needles: ["a"], text: "all" }])
    );

    expect(source).not.toContain("unwritten");
    expect(source).not.toContain("score: 0");
  });

  test("carries the prompt verbatim", () => {
    const prompt = "Read the file.\nThen write the note.";
    const source = renderEvalSuite(oneCase([], { prompt }));

    expect(source).toContain("Read the file.\nThen write the note.");
  });

  /** A backtick closes the literal and `${` opens a substitution; either one
   * unescaped turns a prompt into code. */
  test("escapes a prompt holding a backtick and a substitution", () => {
    const prompt = `Run \`bun test\` and report ${OPENS_SUBSTITUTION}count} failures.`;
    const source = renderEvalSuite(oneCase([], { prompt }));

    expect(source).toContain(
      `Run \\\`bun test\\\` and report \\${OPENS_SUBSTITUTION}count}`
    );
    expect(parseErrorsIn(source)).toHaveLength(0);
  });

  test("escapes a needle holding a quote and a backslash", () => {
    const source = renderEvalSuite(
      oneCase([
        {
          kind: "content_contains_all",
          needles: ['a "quoted" \\ word'],
          text: "quotes",
        },
      ])
    );

    expect(source).toContain('"a \\"quoted\\" \\\\ word"');
    expect(parseErrorsIn(source)).toHaveLength(0);
  });

  /** A comment terminator inside the author's text would end the comment and
   * run the rest of their sentence as code. */
  test("cannot be escaped out of a comment", () => {
    const source = renderEvalSuite(
      oneCase(["closes the block */ and then some;"])
    );

    expect(source).toContain("/* closes the block *\\/ and then some; */");
    expect(parseErrorsIn(source)).toHaveLength(0);
  });

  test("folds a newline in prose onto the comment's one line", () => {
    const source = renderEvalSuite(oneCase(["first line\nsecond line"]));

    expect(source).toContain("/* first line second line */");
    expect(parseErrorsIn(source)).toHaveLength(0);
  });

  test("parses as TypeScript with both dialects in one suite", () => {
    const source = renderEvalSuite(
      suiteOf([
        {
          assertions: [
            { kind: "content_contains_any", needles: ["x"], text: "any" },
            "A human writes this one.",
          ],
          expected_output: `Something \`quoted\` and ${OPENS_SUBSTITUTION}interpolated}.`,
          files: ["fixtures/notes"],
          id: 1,
          name: "Mixed case",
          prompt: "Do it.",
        },
      ])
    );

    expect(parseErrorsIn(source)).toHaveLength(0);
  });

  test("names the fixture directories the JSON did not carry", () => {
    const source = renderEvalSuite(oneCase([], { files: ["fixtures/notes"] }));

    expect(source).toContain("fixtures/notes");
    expect(source).toContain("source: files({}),");
  });

  test("says a case named no fixture directory", () => {
    expect(renderEvalSuite(oneCase([]))).toContain(
      "named no fixture directory"
    );
  });

  test("carries expected output as a comment, not as a check", () => {
    const source = renderEvalSuite(
      oneCase([], { expected_output: "A short note." })
    );

    expect(source).toContain("/* The file's expected output: A short note. */");
  });

  test("runs three trials", () => {
    expect(renderEvalSuite(oneCase([]))).toContain("trials: 3,");
  });

  test("declares one task for the author to edit", () => {
    const source = renderEvalSuite(oneCase([]));

    expect(source).toContain("harness:");
    expect(source.match(/harness:/g)).toHaveLength(1);
  });

  test("names a case the file left unnamed after its id", () => {
    expect(renderEvalSuite(oneCase([], { id: 7 }))).toContain('name: "case-7"');
  });
});

describe("the tally", () => {
  test("separates what converted from what needs a human", () => {
    expect(
      tallyOf(
        suiteOf([
          {
            assertions: [
              { kind: "content_contains_any", needles: ["a"], text: "any" },
              "prose one",
            ],
            files: [],
            id: 1,
            prompt: "a",
          },
          { assertions: ["prose two"], files: [], id: 2, prompt: "b" },
        ])
      )
    ).toEqual({ cases: 2, converted: 1, needsAuthor: 2 });
  });
});
