import type {
  EvalsJsonCase,
  EvalsJsonFile,
  StructuredAssertion,
} from "./evals-json-schema";
import { commentSafe, quoted, templated } from "./typescript-literal";

const SCORER_OF: Record<StructuredAssertion["kind"], string> = {
  content_contains_all: "answerContainsAll",
  content_contains_any: "answerContainsAny",
  content_contains_none: "answerContainsNone",
};

const PLACEHOLDER = "unwritten";

export interface ImportTally {
  readonly cases: number;
  readonly converted: number;
  readonly needsAuthor: number;
}

const isStructured = (
  assertion: EvalsJsonCase["assertions"][number]
): assertion is StructuredAssertion => typeof assertion !== "string";

export const tallyOf = (file: EvalsJsonFile): ImportTally => {
  const assertions = file.evals.flatMap((subject) => subject.assertions);

  return {
    cases: file.evals.length,
    converted: assertions.filter(isStructured).length,
    needsAuthor: assertions.filter((one) => !isStructured(one)).length,
  };
};

const scorersUsed = (file: EvalsJsonFile) => [
  ...new Set(
    file.evals
      .flatMap((subject) => subject.assertions)
      .filter(isStructured)
      .map((assertion) => SCORER_OF[assertion.kind])
  ),
];

const slug = (value: string, fallback: string) => {
  const cleaned = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  return cleaned === "" ? fallback : cleaned;
};

const nameOf = (subject: EvalsJsonCase) =>
  slug(subject.name ?? `case ${subject.id}`, `case-${subject.id}`);

const scorerLine = (assertion: StructuredAssertion) =>
  [
    `        /* ${commentSafe(assertion.text)} */`,
    `        ${SCORER_OF[assertion.kind]}([${assertion.needles.map(quoted).join(", ")}]),`,
  ].join("\n");

/** The author's own words, kept whole, because they are the specification for
 * the check that replaces the line beneath them. */
const proseLine = (text: string) =>
  [
    "        /* Write this check, then delete the line under it: */",
    `        /* ${commentSafe(text)} */`,
    `        ${PLACEHOLDER}(${quoted(text)}),`,
  ].join("\n");

const scorerLines = (subject: EvalsJsonCase) =>
  subject.assertions
    .map((assertion) =>
      isStructured(assertion) ? scorerLine(assertion) : proseLine(assertion)
    )
    .join("\n");

const expectationComment = (subject: EvalsJsonCase) =>
  subject.expected_output === undefined
    ? []
    : [
        `      /* The file's expected output: ${commentSafe(subject.expected_output)} */`,
      ];

/** The JSON names fixture directories by convention and carries none of their
 * contents, so the author supplies the files the name stood for. */
const sourceComment = (subject: EvalsJsonCase) =>
  subject.files.length === 0
    ? "      /* This case named no fixture directory. Add the files it starts from. */"
    : `      /* This case named ${subject.files.map(commentSafe).join(", ")}. The JSON carries the directory names, not their contents, so add the files here. */`;

const caseBlock = (subject: EvalsJsonCase) =>
  [
    "    {",
    `      name: ${quoted(nameOf(subject))},`,
    ...expectationComment(subject),
    "      variables: {",
    `        task: ${templated(subject.prompt)},`,
    "      },",
    sourceComment(subject),
    "      source: files({}),",
    "      scorers: [",
    scorerLines(subject),
    "      ],",
    "    },",
  ].join("\n");

/** Local rather than imported, so the generated file carries its own proof
 * that an unconverted assertion fails. Deleting the last call deletes it. */
const placeholderBlock = [
  "/* A check nobody has written yet. It scores zero so the case stays red",
  "   until the prose above it becomes a real check. */",
  `const ${PLACEHOLDER} = (specification: string) => () => ({`,
  '  evidence: "nobody has written this check yet",',
  "  name: specification,",
  "  score: 0,",
  "});",
].join("\n");

const importsOf = (file: EvalsJsonFile) =>
  `import { ${["defineEval", "files", ...scorersUsed(file)].join(", ")} } from "anpord";`;

export const renderEvalSuite = (file: EvalsJsonFile) => {
  const prose = tallyOf(file).needsAuthor > 0;

  return `${[
    importsOf(file),
    "",
    ...(prose ? [placeholderBlock, ""] : []),
    "export default defineEval({",
    `  name: ${quoted(slug(file.skill_name, "imported-suite"))},`,
    '  prompt: "{{task}}",',
    "  trials: 3,",
    "  cases: [",
    file.evals.map(caseBlock).join("\n"),
    "  ],",
    "  tasks: [",
    "    /* Name the harness, model and sandbox this suite runs on. */",
    '    { harness: "codex", model: "gpt-5.6-sol", provider: "daytona" },',
    "  ],",
    "});",
  ].join("\n")}\n`;
};
