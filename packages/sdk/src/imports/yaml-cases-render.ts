import type { ImportTally } from "./evals-json-render";
import { commentSafe, quoted, templated } from "./typescript-literal";
import { placeholderBlock, proseLine } from "./unwritten-check";
import type { YamlCase } from "./yaml-cases-schema";

/** One file is one case, so the file's own name is what the author searches
 * for when a case fails. */
export interface YamlCaseFile {
  readonly path: string;
  readonly subject: YamlCase;
}

const slug = (value: string, fallback: string) => {
  const cleaned = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  return cleaned === "" ? fallback : cleaned;
};

/** Every line is prose a person wrote for a model judge, so none of it
 * converts and the whole list is what a human still owes. A case with no
 * lines owes one too: something has to say what a good answer is. */
export const tallyOf = (files: readonly YamlCaseFile[]): ImportTally => ({
  cases: files.length,
  converted: 0,
  needsAuthor: files.reduce(
    (total, file) => total + Math.max(file.subject.judge_context.length, 1),
    0
  ),
});

/** Anpord has no step budget, so the number is kept as a note rather than
 * dropped: the suite it came from ran under it, and a case that needed ten
 * steps is a different case from one that needed a hundred. */
const budgetComment = (subject: YamlCase) =>
  `      /* The file allowed ${subject.max_steps} steps. Anpord does not cap steps, so this is a note, not a limit. */`;

/** A file with no judge context says nothing about what a good answer is, so
 * it is owed a check like any other rather than passing by default. */
const UNJUDGED =
  "This case named no judge context. Write what a good answer is.";

const judgeLines = (subject: YamlCase) =>
  (subject.judge_context.length === 0 ? [UNJUDGED] : subject.judge_context)
    .map((line) => proseLine(line))
    .join("\n");

const caseBlock = (file: YamlCaseFile) =>
  [
    "    {",
    `      name: ${quoted(slug(file.subject.name, "case"))},`,
    `      /* Imported from ${commentSafe(file.path)}. */`,
    budgetComment(file.subject),
    "      variables: {",
    `        task: ${templated(file.subject.task)},`,
    "      },",
    "      /* The YAML names no starting files, so add the ones this case works on. */",
    "      source: files({}),",
    "      validate: async (context) => {",
    "        const answer = await context.answer();",
    "",
    "        return [",
    judgeLines(file.subject),
    "        ].every(Boolean);",
    "      },",
    "    },",
  ].join("\n");

/** A directory has no name of its own in the files, so a suite built from
 * several is named generically and the author renames it. */
const suiteName = (files: readonly YamlCaseFile[]) =>
  files.length === 1
    ? slug(files[0]?.subject.name ?? "", "imported-suite")
    : "imported-suite";

export const renderYamlSuite = (files: readonly YamlCaseFile[]) =>
  `${[
    'import { defineEval, files } from "anpord";',
    "",
    placeholderBlock,
    "",
    "export default defineEval({",
    `  name: ${quoted(suiteName(files))},`,
    '  prompt: "{{task}}",',
    "  trials: 3,",
    "  cases: [",
    files.map(caseBlock).join("\n"),
    "  ],",
    "  tasks: [",
    "    /* Name the harness, model and sandbox this suite runs on. */",
    '    { harness: "codex", model: "gpt-5.6-sol", provider: "daytona" },',
    "  ],",
    "});",
  ].join("\n")}\n`;
