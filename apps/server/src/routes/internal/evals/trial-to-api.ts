import type { HarnessEvent } from "@anpord/eval/domain/harness-event";
import {
  commandsIn,
  failedCommandsIn,
  filesIn,
} from "@anpord/eval/domain/journal";
import type { GridCell } from "@anpord/eval/grid/state";
import type { EvalJournalEntry, EvalTrial } from "@anpord/schema/domain/evals";
import { Option } from "effect";

const JOURNAL_OUTPUT_LIMIT = 4000;

const waiting = (
  ordinal: number,
  journal: readonly HarnessEvent[]
): EvalTrial => ({
  commands: commandsIn(journal),
  costs: null,
  prepared: null,
  exitCode: -1,
  failedCommands: failedCommandsIn(journal),
  filesChanged: [...filesIn(journal)],
  modelMs: 0,
  ordinal,
  passed: false,
  sandboxId: null,
  sandboxMs: 0,
  status: "running",
  timed: new Set(journal.map((event) => event.at)).size > 1,
  trajectory: asTrajectory(journal),
  usage: null,
  verifySteps: [],
  voidFields: [],
});

const millisOrNull = (at: number | undefined) => at ?? null;

const asTrajectory = (
  events: readonly HarnessEvent[]
): readonly EvalJournalEntry[] =>
  events.flatMap((event): readonly EvalJournalEntry[] => {
    if (event._tag === "Command") {
      return [
        {
          _tag: "command" as const,
          command: event.command,
          exitCode: event.exitCode,
          finishedAtMillis: millisOrNull(event.at),
          output: event.output.slice(0, JOURNAL_OUTPUT_LIMIT),
          startedAtMillis: millisOrNull(event.startedAt),
        },
      ];
    }

    if (event._tag === "Message") {
      return [
        {
          _tag: "message" as const,
          finishedAtMillis: millisOrNull(event.at),
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
          name: event.name,
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
  });

export const asTrials = (cell: GridCell): readonly EvalTrial[] =>
  cell.trials.map((trial, index) =>
    Option.match(trial, {
      onNone: () => waiting(index + 1, cell.live.get(index + 1) ?? []),
      onSome: (result) => ({
        commands: result.commands,
        costs: null,
        prepared: result.prepared,
        exitCode: result.outcome.exitCode,
        failedCommands: result.failedCommands,
        filesChanged: [...result.filesChanged],
        modelMs: result.outcome.modelMs,
        ordinal: index + 1,
        passed: result.outcome.passed,
        sandboxId: result.sandboxId,
        sandboxMs: result.outcome.sandboxMs,
        status: result.outcome.status,

        timed: new Set(result.events.map((event) => event.at)).size > 1,
        trajectory: asTrajectory(result.events),
        usage: Option.getOrNull(result.usage),
        verifySteps: [...result.outcome.verifySteps],
        voidFields: [...result.outcome.voidFields],
      }),
    })
  );
