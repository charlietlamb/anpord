import {
  Playground,
  type PlaygroundCell,
  type PlaygroundRun,
} from "@anpord/eval/services/playground";
import { NotFound } from "@anpord/schema/domain/errors";
import type {
  EvalCell,
  EvalRun,
  EvalRunSummary,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { DateTime, Effect, Option, Redacted } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { EvalCredentials } from "./credentials";

/** Pinned, because the cell key carries it: an unpinned install silently
 * compares two different harnesses a month apart. */
const HARNESS_VERSION = "0.144.4";

const summarise = (run: PlaygroundRun): EvalRunSummary => ({
  caseCount: run.cases.length,
  id: run.id,
  startedAt: DateTime.unsafeMake(run.startedAt),
  status: run.status,
  taskCount: run.tasks.length,
});

const waiting = (ordinal: number): EvalTrial => ({
  commands: 0,
  failedCommands: 0,
  filesChanged: [],
  journal: [],
  modelMs: 0,
  ordinal,
  passed: false,
  sandboxId: null,
  sandboxMs: 0,
  status: "running",
  voidFields: [],
});

/** The journal travels with the trial rather than behind another request. An
 * exit code the caller cannot see is the thing this system exists to stop
 * being invisible. */
const asTrials = (cell: PlaygroundCell): readonly EvalTrial[] =>
  cell.trials.map((trial, index) =>
    Option.match(trial, {
      onNone: () => waiting(index + 1),
      onSome: (result) => ({
        commands: result.commands,
        failedCommands: result.failedCommands,
        filesChanged: [...result.filesChanged],
        journal: result.events
          .filter((event) => event._tag === "Command")
          .map((event) => ({
            command: event.command,
            exitCode: event.exitCode,
            output: event.output.slice(0, 4000),
          })),
        modelMs: result.outcome.modelMs,
        ordinal: index + 1,
        passed: result.outcome.passed,
        sandboxId: result.sandboxId,
        sandboxMs: result.outcome.sandboxMs,
        status: result.outcome.status,
        voidFields: [...result.outcome.voidFields],
      }),
    })
  );

const asCell = (cell: PlaygroundCell): EvalCell => ({
  caseName: cell.caseName,
  distribution: Option.getOrNull(cell.distribution),
  status: cell.status,
  taskIndex: cell.taskIndex,
  trials: asTrials(cell),
});

const detail = (run: PlaygroundRun): EvalRun => ({
  cases: [...run.cases],
  cells: run.cells.map(asCell),
  failure: Option.getOrNull(run.failure),
  finishedAt: Option.map(run.finishedAt, DateTime.unsafeMake).pipe(
    Option.getOrNull
  ),
  id: run.id,
  startedAt: DateTime.unsafeMake(run.startedAt),
  status: run.status,
  /* The domain knows three harnesses and the API exposes the one that works,
     so the boundary narrows rather than leaking a name a client cannot act
     on. Adding Claude Code widens both, in that order. */
  tasks: run.tasks.map((task) => ({
    harness: "codex" as const,
    model: task.model,
    provider: task.provider,
  })),
});

export const EvalsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "evals",
  (handlers) =>
    authorized(handlers)
      .handle("list", { permission: Permissions.Evals.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const playground = yield* Playground;
          const runs = yield* playground.list(actor.organizationId);

          return runs.map(summarise);
        })
      )
      /* Running an eval spends real money on sandboxes and model tokens, so it
         needs the write permission rather than the read one. */
      .handle("start", { permission: Permissions.Evals.Write }, ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const playground = yield* Playground;
          const credentials = yield* EvalCredentials;

          const id = yield* playground.start({
            cases: payload.cases.map((subject) => ({
              goal: subject.goal,
              name: subject.name,
              setup: subject.setup,
              source: subject.source,
              verify: subject.verify,
            })),
            credentials: Redacted.make(credentials.codexAuth),
            organizationId: actor.organizationId,
            prompt: payload.prompt,
            tasks: payload.tasks.map((task) => ({
              harness: task.harness,
              harnessVersion: HARNESS_VERSION,
              model: task.model,
              provider: task.provider,
            })),
            trials: payload.trials,
          });

          return { id };
        })
      )
      .handle("get", { permission: Permissions.Evals.Read }, ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const playground = yield* Playground;
          const found = yield* playground.get(actor.organizationId, path.id);

          if (Option.isNone(found)) {
            return yield* Effect.fail(
              new NotFound({ message: `No eval run with id "${path.id}"` })
            );
          }

          return detail(found.value);
        })
      ).done
);
