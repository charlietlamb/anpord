import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";

const JOURNAL_OUTPUT_LIMIT = 4000;

const millisOrNull = (at: number | undefined) => at ?? null;

export const asEntries = (event: HarnessEvent): readonly EvalJournalEntry[] => {
  if (event._tag === "Command") {
    return [
      {
        _tag: "command" as const,
        command: event.command,
        exitCode: event.exitCode,
        finishedAtMillis: millisOrNull(event.at),
        output: event.output.slice(0, JOURNAL_OUTPUT_LIMIT),
        outputTruncated: event.output.length > JOURNAL_OUTPUT_LIMIT,
        startedAtMillis: millisOrNull(event.startedAt),
      },
    ];
  }

  if (event._tag === "Message") {
    return [
      {
        _tag: "message" as const,
        finishedAtMillis: millisOrNull(event.at),
        role: event.role,
        text: event.text,
        usage: event.usage ?? null,
      },
    ];
  }

  if (event._tag === "ToolCall") {
    return [
      {
        _tag: "toolCall" as const,
        finishedAtMillis: millisOrNull(event.at),
        input: event.input.slice(0, JOURNAL_OUTPUT_LIMIT),
        inputTruncated: event.input.length > JOURNAL_OUTPUT_LIMIT,
        name: event.name,
        output: event.output?.slice(0, JOURNAL_OUTPUT_LIMIT),
        outputTruncated: (event.output?.length ?? 0) > JOURNAL_OUTPUT_LIMIT,
        error: event.error?.slice(0, JOURNAL_OUTPUT_LIMIT),
        errorTruncated: (event.error?.length ?? 0) > JOURNAL_OUTPUT_LIMIT,
        startedAtMillis: millisOrNull(event.startedAt),
        status: event.status,
      },
    ];
  }

  if (event._tag === "FileChange") {
    return [
      {
        _tag: "fileChange" as const,
        finishedAtMillis: millisOrNull(event.at),
        paths: [...event.paths],
      },
    ];
  }

  return [];
};
