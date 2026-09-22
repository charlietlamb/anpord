import {
  commandsIn,
  failedCommandsIn,
  filesIn,
} from "@anpord/eval/domain/journal";
import { asEntries } from "@anpord/eval/domain/journal-entries";
import type { GridCell } from "@anpord/eval/grid/state";
import type { EvalJournalEntry, EvalTrial } from "@anpord/schema/domain/evals";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { Option } from "effect";

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

const asTrajectory = (
  events: readonly HarnessEvent[]
): readonly EvalJournalEntry[] => events.flatMap(asEntries);

export const asTrials = (cell: GridCell): readonly EvalTrial[] =>
  cell.trials.map((trial, index) =>
    Option.match(trial, {
      onNone: () => waiting(index + 1, cell.live.get(index + 1) ?? []),
      onSome: (result) => ({
        artifacts: result.outcome.artifacts?.map(
          ({ path, byteSize, sha256 }) => ({ path, byteSize, sha256 })
        ),
        commands: result.commands,
        judgments: result.outcome.judgments ?? [],
        validations: result.outcome.validations,
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
