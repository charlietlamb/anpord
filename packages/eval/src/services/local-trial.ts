import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import type { EvalPrepare, EvalValidator } from "@anpord/schema/domain/evals";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import type { TrialOutcome } from "@anpord/schema/domain/trial";
import { Clock, Context, Effect, Layer } from "effect";
import { CredentialResolver } from "../credentials/resolver";
import type { HarnessName } from "../domain/cell";
import type { RequestedProfile } from "../domain/harness-profile";
import type { WorkspaceSource } from "../domain/workspace-source";
import { AgentTrial, type AgentTrialResult } from "./agent-trial";
import { forwardedEnv } from "./forwarded-env";

const WORKSPACE = "/tmp/anpord-local";
const AUTO_STOP_MINUTES = 15;

/* A run on the machine that asked for it: no grid, no repositories, no cell.
   Everything the hosted path persists is returned to the caller instead. */
export interface LocalTrialRequest {
  readonly caseName: string;
  readonly forwardEnv?: readonly string[];
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly onProgress?: (
    events: readonly HarnessEvent[]
  ) => Effect.Effect<void>;
  readonly prepare?: EvalPrepare | null;
  readonly profile?: RequestedProfile | null;
  readonly prompt: string;
  readonly source: WorkspaceSource;
  readonly user?: EvalUser | null;
  readonly validator?: EvalValidator | null;
  readonly verifyCommand: string | null;
}

interface LocalTrialOutcome {
  readonly caseName: string;
  readonly durationMs: number;
  readonly events: readonly HarnessEvent[];
  readonly outcome: TrialOutcome;
  readonly result: AgentTrialResult;
}

export interface LocalTrialsShape {
  readonly run: (
    request: LocalTrialRequest
  ) => Effect.Effect<
    LocalTrialOutcome,
    Effect.Effect.Error<ReturnType<AgentTrialShape["run"]>>,
    never
  >;
}

type AgentTrialShape = Context.Tag.Service<typeof AgentTrial>;

export class LocalTrials extends Context.Tag("@anpord/eval/LocalTrials")<
  LocalTrials,
  LocalTrialsShape
>() {}

export const LocalTrialsLive = Layer.effect(
  LocalTrials,
  Effect.gen(function* () {
    const agent = yield* AgentTrial;
    const credentials = yield* CredentialResolver;

    const run = (request: LocalTrialRequest) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;

        const harnessCredential = yield* credentials
          .resolve({
            actor: { kind: "local" } as never,
            integrationId: request.harness,
          })
          .pipe(Effect.orDie);

        const result = yield* agent.run({
          autoStopMinutes: AUTO_STOP_MINUTES,
          forwarded: forwardedEnv(request.forwardEnv ?? [], process.env),
          harness: request.harness,
          harnessCredential,
          harnessVersion: request.harnessVersion,
          model: request.model,
          organizationId: "local",
          prepare: request.prepare ?? null,
          profile: request.profile ?? null,
          progress:
            request.onProgress === undefined
              ? undefined
              : {
                  append: (events) =>
                    request.onProgress?.(events) ?? Effect.void,
                },
          prompt: request.prompt,
          provider: "local",
          source: request.source,
          user: request.user ?? null,
          validator: request.validator ?? null,
          verifyCommand: request.verifyCommand,
          workspace: WORKSPACE,
        });

        const finishedAt = yield* Clock.currentTimeMillis;

        return {
          caseName: request.caseName,
          durationMs: finishedAt - startedAt,
          events: result.events,
          outcome: result.outcome,
          result,
        };
      }).pipe(
        Effect.withSpan("LocalTrials.run", {
          attributes: { case: request.caseName, harness: request.harness },
        })
      );

    return LocalTrials.of({ run });
  })
);
