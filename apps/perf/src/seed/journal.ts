import type {
  HarnessEvent,
  HarnessUsage,
} from "@sphynx/schema/domain/harness-event";
import type { TrialOutcome } from "@sphynx/schema/domain/trial";
import type { Random } from "./random";

const WORDS = [
  "read",
  "the",
  "failing",
  "test",
  "then",
  "patch",
  "parser",
  "module",
  "and",
  "rerun",
  "suite",
  "config",
  "handler",
  "cache",
  "request",
  "schema",
];

export const JOURNAL_COMMANDS = [
  "bun test packages/eval",
  "rg -n 'export const' src",
  "cat package.json",
  "git diff --stat",
  "ls -la src/routes",
  "bunx tsc --noEmit",
];

export const JOURNAL_EPOCH = Date.UTC(2026, 8, 1);

const TOOLS = ["read_file", "edit_file", "search", "list_directory"];

const prose = (random: Random, words: number) =>
  Array.from({ length: words }, () => random.pick(WORDS)).join(" ");

export const trialUsage = (random: Random): HarnessUsage => {
  const inputTokens = random.between(800, 6000);
  const outputTokens = random.between(50, 900);
  const cacheReadTokens = random.between(0, inputTokens);
  const cacheWriteTokens = random.between(0, 400);
  return {
    cacheReadTokens,
    cacheWriteTokens,
    costUsd: (inputTokens * 1.25 + outputTokens * 10) / 1_000_000,
    inputTokens,
    outputTokens,
    totalTokens:
      inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  };
};

const middleEvent = (
  random: Random,
  at: number,
  index: number
): HarnessEvent => {
  const kind = index % 4;
  if (kind === 0) {
    return {
      _tag: "Message",
      at,
      role: "assistant",
      text: prose(random, random.between(20, 120)),
      usage: trialUsage(random),
    };
  }
  if (kind === 1) {
    return {
      _tag: "Command",
      at,
      command: random.pick(JOURNAL_COMMANDS),
      exitCode: random.chance(0.85) ? 0 : 1,
      output: prose(random, random.between(10, 160)),
      startedAt: at - random.between(20, 900),
    };
  }
  if (kind === 2) {
    return {
      _tag: "ToolCall",
      at,
      callId: `call_${index}`,
      input: JSON.stringify({ path: `src/${random.pick(WORDS)}.ts` }),
      name: random.pick(TOOLS),
      output: prose(random, random.between(10, 80)),
      startedAt: at - random.between(5, 200),
      status: "completed",
    };
  }
  return {
    _tag: "FileChange",
    at,
    paths: [`src/${random.pick(WORDS)}.ts`, `src/${random.pick(WORDS)}.ts`],
  };
};

const journal = (
  random: Random,
  events: number,
  startedAt: number
): readonly HarnessEvent[] => {
  const middle = Math.max(0, events - 2);
  const step = 350;
  return [
    { _tag: "Started", at: startedAt, model: "perf-model", sessionId: "perf" },
    ...Array.from({ length: middle }, (_, index) =>
      middleEvent(random, startedAt + (index + 1) * step, index)
    ),
    { _tag: "Finished", at: startedAt + (middle + 1) * step, reason: "done" },
  ];
};

const outcome = (
  random: Random,
  events: readonly HarnessEvent[]
): TrialOutcome => {
  const passed = random.chance(0.7);
  return {
    artifacts: [],
    commandCount: events.filter((event) => event._tag === "Command").length,
    exitCode: passed ? 0 : 1,
    modelMs: random.between(4000, 90_000),
    sandboxMs: random.between(500, 20_000),
    status: passed ? "passed" : "failed",
    validations: [],
    verifySteps: [],
    voidFields: [],
  };
};

export const trialReport = (
  random: Random,
  events: number,
  startedAt: number,
  slot: { readonly ordinal: number; readonly runId: string },
  sandboxId: string
) => {
  const written = journal(random, events, startedAt);
  return {
    events: written,
    ordinal: slot.ordinal,
    outcome: outcome(random, written),
    runId: slot.runId,
    sandboxId,
    usage: trialUsage(random),
  };
};
