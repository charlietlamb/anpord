import { callSubjectOf, commandText } from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";

export type StepVerb =
  | "agent"
  | "called"
  | "ran"
  | "read"
  | "searched"
  | "wrote"
  | "you";

export interface StepTitle {
  readonly target: string | null;
  readonly title: string;
  readonly verb: StepVerb;
}

export const describeStep = (entry: EvalJournalEntry): StepTitle => {
  switch (entry._tag) {
    case "command":
      return describeCommand(entry.command);
    case "fileChange":
      return describeFiles("wrote", "Wrote", entry.paths);
    case "toolCall":
      return {
        target: callSubjectOf(entry.input),
        title: `Called ${entry.name}`,
        verb: "called",
      };
    case "message":
      return {
        target: null,
        title: summarizeMessage(entry.text),
        verb: entry.role === "user" ? "you" : "agent",
      };
    default:
      return entry satisfies never;
  }
};

export const describeCommand = (command: string): StepTitle => {
  const segments = splitSegments(commandText(command));
  const [first] = segments;

  if (first === undefined) {
    return { target: null, title: "Ran a command", verb: "ran" };
  }

  if (segments.every((words) => READERS.has(words[0] ?? ""))) {
    const files = segments.flatMap((words) => operandsOf(words).at(-1) ?? []);
    return files.length > 0
      ? describeFiles("read", "Read", files)
      : describeRun(first);
  }

  return SEARCHERS.has(first[0] ?? "")
    ? describeSearch(first)
    : describeRun(first);
};

export const summarizeMessage = (text: string) => {
  const plain = text.replace(MARKUP, "").replace(WHITESPACE, " ").trim();
  return SENTENCE.exec(plain)?.[1] ?? plain;
};

const READERS = new Set(["bat", "cat", "head", "less", "nl", "sed", "tail"]);
const SEARCHERS = new Set(["ag", "fd", "find", "grep", "ls", "rg", "tree"]);
const RUNNERS = new Set(["bunx", "npx", "pnpx"]);
const SCRIPT_RUNNERS = new Set(["bun", "npm", "pnpm", "yarn"]);

const TOKEN = /'[^']*'|"[^"]*"|&&|\|\||[|;]|[^\s|;&]+/g;
const SEPARATORS = new Set(["&&", "||", ";"]);
const QUOTES = /^['"]|['"]$/g;
const MARKUP = /[*`#>_]+/g;
const SENTENCE = /^(.+?[.!?])(?:\s|$)/;
const WHITESPACE = /\s+/g;

const splitSegments = (script: string) => {
  const segments: string[][] = [[]];
  let piped = false;

  for (const token of script.match(TOKEN) ?? []) {
    if (SEPARATORS.has(token)) {
      segments.push([]);
      piped = false;
    } else if (token === "|") {
      piped = true;
    } else if (!piped) {
      segments.at(-1)?.push(token.replace(QUOTES, ""));
    }
  }

  return segments.filter((words) => words.length > 0);
};

const operandsOf = (words: readonly string[]) =>
  words.slice(1).filter((word) => !word.startsWith("-"));

const baseName = (path: string) => path.split("/").at(-1) ?? path;

const describeFiles = (
  verb: StepVerb,
  word: string,
  paths: readonly string[]
): StepTitle => {
  const files = paths.map(baseName);
  const [only] = files;

  return {
    target: files.join(", "),
    title:
      files.length === 1 && only !== undefined
        ? `${word} ${only}`
        : `${word} ${files.length} files`,
    verb,
  };
};

const describeSearch = (words: readonly string[]): StepTitle => {
  const [program] = words;
  const operands = operandsOf(words);

  if (program === "ls" || program === "tree" || words.includes("--files")) {
    return {
      target: program === "ls" ? (operands[0] ?? null) : null,
      title: "Listed files",
      verb: "searched",
    };
  }

  const [pattern, where = null] = operands;

  return {
    target: where,
    title: pattern === undefined ? "Searched files" : `Searched for ${pattern}`,
    verb: "searched",
  };
};

const describeRun = (words: readonly string[]): StepTitle => {
  const [program = "command", first, second] = words;
  const operands = operandsOf(words);

  if (RUNNERS.has(program) && first !== undefined) {
    const tool = [first, operands[1]].filter(Boolean).join(" ");
    return { target: tool, title: `Ran ${tool}`, verb: "ran" };
  }

  if (SCRIPT_RUNNERS.has(program) && first === "run" && second !== undefined) {
    return { target: second, title: `Ran the ${second} script`, verb: "ran" };
  }

  const tool =
    program === "git" && first !== undefined ? `git ${first}` : program;

  return { target: tool, title: `Ran ${tool}`, verb: "ran" };
};
