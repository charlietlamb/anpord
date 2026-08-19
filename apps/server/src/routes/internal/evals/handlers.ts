import {
  Playground,
  type PlaygroundRun,
} from "@anpord/eval/services/playground";
import { NotFound } from "@anpord/schema/domain/errors";
import type { EvalRun, EvalRunSummary } from "@anpord/schema/domain/evals";
import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { DateTime, Effect, Option, Redacted } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { EvalCredentials } from "./credentials";

const HARNESS_VERSION = "0.144.4";

const summarise = (run: PlaygroundRun): EvalRunSummary => ({
  distribution: Option.getOrNull(run.distribution),
  harness: "codex",
  id: run.id,
  model: run.model,
  provider: run.provider,
  startedAt: DateTime.unsafeMake(run.startedAt),
  status: run.status,
  taskName: run.taskName,
});

/** The journal is the product's evidence, so it travels with the trial rather
 * than behind another request: an exit code the caller cannot see is the thing
 * this system exists to stop being invisible. */
const detail = (run: PlaygroundRun): EvalRun => ({
  ...summarise(run),
  cellKey: run.cellKey,
  failure: Option.getOrNull(run.failure),
  finishedAt: Option.map(run.finishedAt, DateTime.unsafeMake).pipe(
    Option.getOrNull
  ),
  trials: run.trials.map((trial) =>
    Option.match(trial.result, {
      onNone: () => ({
        commands: 0,
        failedCommands: 0,
        filesChanged: [],
        journal: [],
        modelMs: 0,
        ordinal: trial.ordinal,
        passed: false,
        sandboxId: null,
        sandboxMs: 0,
        status: "running" as const,
        voidFields: [],
      }),
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
        ordinal: trial.ordinal,
        passed: result.outcome.passed,
        sandboxId: result.sandboxId,
        sandboxMs: result.outcome.sandboxMs,
        status: result.outcome.status,
        voidFields: [...result.outcome.voidFields],
      }),
    })
  ),
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
            credentials: Redacted.make(credentials.codexAuth),
            harness: "codex",
            harnessVersion: HARNESS_VERSION,
            model: payload.model,
            organizationId: actor.organizationId,
            provider: payload.provider,
            task: {
              files: payload.task.files,
              name: payload.task.name,
              prompt: payload.task.prompt,
              setupCommand: payload.task.setupCommand,
              verifyCommand: payload.task.verifyCommand,
            },
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
