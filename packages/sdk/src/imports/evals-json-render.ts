import type {
  EvalsJsonCase,
  EvalsJsonFile,
  StructuredAssertion,
} from "./evals-json-schema";
import { commentSafe, quoted, templated } from "./typescript-literal";

const SCORER_OF: Record<StructuredAssertion["kind"], string> = {
  content_contains_all: "containsAll",
  content_contains_any: "containsAny",
  content_contains_none: "containsNone",
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
    `          /* ${commentSafe(assertion.text)} */`,
    `          ${SCORER_OF[assertion.kind]}(answer, [${assertion.needles.map(quoted).join(", ")}]),`,
  ].join("\n");

/** The author's own words, kept whole, because they are the specification for
 * the check that replaces the line beneath them. */
const proseLine = (text: string) =>
  [
    "          /* Write this check, then delete the line under it: */",
    `          /* ${commentSafe(text)} */`,
    `          ${PLACEHOLDER}(${quoted(text)}),`,
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
    "      validate: async (context) => {",
    "        const answer = await context.answer();",
    "",
    "        return [",
    scorerLines(subject),
    "        ].every(Boolean);",
    "      },",
    "    },",
  ].join("\n");

/** Local rather than imported, so the generated file carries its own proof
 * that an unconverted assertion fails. Deleting the last call deletes it. */
const placeholderBlock = [
  "/* A check nobody has written yet. It is false, so the case stays red until",
  "   the sentence above it becomes a real check. The argument is that",
  "   sentence, kept so the file says what is owed. */",
  `const ${PLACEHOLDER} = (_specification: string) => false;`,
].join("\n");

const importsOf = () => 'import { defineEval, files } from "anpord";';

/* Emitted into the file rather than imported, so an imported suite is one
   self-contained module a reader can follow and edit without learning the
   scorer library first. Matching is case-insensitive, which is what a person
   writing "Mentions the Dashboard" means. */
const helpersBlock = [
  "const has = (answer: string, needle: string) =>",
  "  answer.toLowerCase().includes(needle.toLowerCase());",
  "",
  "const containsAny = (answer: string, needles: string[]) =>",
  "  needles.some((needle) => has(answer, needle));",
  "",
  "const containsAll = (answer: string, needles: string[]) =>",
  "  needles.every((needle) => has(answer, needle));",
  "",
  "const containsNone = (answer: string, needles: string[]) =>",
  "  !needles.some((needle) => has(answer, needle));",
].join("\n");

export const renderEvalSuite = (file: EvalsJsonFile) => {
  const tally = tallyOf(file);
  const prose = tally.needsAuthor > 0;
  const structured = tally.converted > 0;

  return `${[
    importsOf(),
    "",
    ...(structured ? [helpersBlock, ""] : []),
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
