import type { EvalJournalEntry } from "@anpord/schema/domain/evals";

export type ConversationStep = Extract<
  EvalJournalEntry,
  { _tag: "command" | "fileChange" | "toolCall" }
>;

export type Call = Extract<ConversationStep, { _tag: "command" | "toolCall" }>;

export type ConversationPart =
  | { readonly _tag: "said"; readonly key: number; readonly text: string }
  | { readonly _tag: "replied"; readonly key: number; readonly text: string }
  | {
      readonly _tag: "wrote";
      readonly key: number;
      readonly paths: readonly string[];
    }
  | {
      readonly _tag: "worked";
      readonly key: number;
      readonly steps: readonly ConversationStep[];
    };

const lastWriteOf = (trajectory: readonly EvalJournalEntry[]) =>
  new Map(
    trajectory.flatMap((entry, key) =>
      entry._tag === "fileChange"
        ? entry.paths.map((path) => [path, key] as const)
        : []
    )
  );

export const artifactFor = <Artifact extends { readonly path: string }>(
  path: string,
  artifacts: readonly Artifact[]
) =>
  artifacts.find(
    (artifact) => path === artifact.path || path.endsWith(`/${artifact.path}`)
  );

export const conversationOf = (
  trajectory: readonly EvalJournalEntry[]
): readonly ConversationPart[] => {
  const parts: ConversationPart[] = [];
  const lastWrite = lastWriteOf(trajectory);
  let working: ConversationStep[] | null = null;

  for (const [key, entry] of trajectory.entries()) {
    if (entry._tag === "message") {
      working = null;
      parts.push({
        _tag: entry.role === "user" ? "said" : "replied",
        key,
        text: entry.text,
      });
      continue;
    }

    const settled =
      entry._tag === "fileChange"
        ? entry.paths.filter((path) => lastWrite.get(path) === key)
        : [];

    if (settled.length > 0) {
      working = null;
      parts.push({ _tag: "wrote", key, paths: settled });
      continue;
    }

    if (working === null) {
      working = [];
      parts.push({ _tag: "worked", key, steps: working });
    }

    working.push(entry);
  }

  return parts;
};

export const thinkingLabel = (
  parts: readonly ConversationPart[],
  running: boolean
) => {
  const last = parts.at(-1);

  if (!running || last === undefined || last._tag === "worked") {
    return null;
  }

  return last._tag === "said" ? "Thinking" : "Working";
};

export const stepFailed = (step: ConversationStep) => {
  if (step._tag === "command") {
    return step.exitCode !== null && step.exitCode !== 0;
  }

  return (
    step._tag === "toolCall" &&
    (step.error !== undefined ||
      step.status === "failed" ||
      step.status === "error")
  );
};

export const counted = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export const summaryOf = (steps: readonly ConversationStep[]) => {
  const commands = steps.filter((step) => step._tag === "command").length;
  const tools = steps.filter((step) => step._tag === "toolCall").length;
  const files = new Set(
    steps.flatMap((step) => (step._tag === "fileChange" ? step.paths : []))
  ).size;

  const clauses = [
    ...(commands === 0
      ? []
      : [`ran ${counted(commands, "command", "commands")}`]),
    ...(tools === 0 ? [] : [`called ${counted(tools, "tool", "tools")}`]),
    ...(files === 0 ? [] : [`wrote ${counted(files, "file", "files")}`]),
  ].join(", ");

  return clauses.charAt(0).toUpperCase() + clauses.slice(1);
};

export const durationOf = (step: ConversationStep) =>
  step._tag === "fileChange" ||
  step.startedAtMillis == null ||
  step.finishedAtMillis == null
    ? null
    : Math.max(0, step.finishedAtMillis - step.startedAtMillis);
