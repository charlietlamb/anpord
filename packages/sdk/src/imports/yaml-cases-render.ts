import type { ImportTally } from "./evals-json-render";
import { commentSafe, quoted, templated } from "./typescript-literal";
import { placeholderBlock, proseLine } from "./unwritten-check";
import type { YamlCase } from "./yaml-cases-schema";

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

/* Judge context is prose for a model, so none of it converts; a case with no
   lines still owes one. */
export const tallyOf = (files: readonly YamlCaseFile[]): ImportTally => ({
  cases: files.length,
  converted: 0,
  needsAuthor: files.reduce(
    (total, file) => total + Math.max(file.subject.judge_context.length, 1),
    0
  ),
});

/* Anpord has no step budget, so the source suite's number survives as a note
   rather than being dropped. */
const budgetComment = (subject: YamlCase) =>
  `      /* The file allowed ${subject.max_steps} steps. Anpord does not cap steps, so this is a note, not a limit. */`;

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

/* The files carry no directory name, so a multi-file suite is named
   generically for the author to rename. */
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
    '    { harness: "codex", model: "gpt-5.6-sol" },',
    "  ],",
    "});",
  ].join("\n")}\n`;
