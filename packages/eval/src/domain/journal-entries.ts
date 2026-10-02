import type { EvalJournalEntry } from "@sphynx/schema/domain/eval-trial";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";

const JOURNAL_OUTPUT_LIMIT = 4000;

const cut = (text: string) =>
  text.length > JOURNAL_OUTPUT_LIMIT
    ? `${text.slice(0, JOURNAL_OUTPUT_LIMIT)}\n[the rest was cut before this was sent, ${text.length} characters in all]`
    : text;

const cutIfPresent = (text: string | undefined) =>
  text === undefined ? text : cut(text);

export const cutToJournal = (event: HarnessEvent): HarnessEvent => {
  if (event._tag === "Command") {
    return { ...event, output: cut(event.output) };
  }

  if (event._tag === "ToolCall") {
    return {
      ...event,
      error: cutIfPresent(event.error),
      input: cut(event.input),
      output: cutIfPresent(event.output),
    };
  }

  return event;
};

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
