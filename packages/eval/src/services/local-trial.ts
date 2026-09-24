import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type Actor,
  OrganizationId,
  UserId,
} from "@anpord/schema/domain/actor";
import type {
  EvalPrepare,
  EvalSource,
  EvalValidator,
} from "@anpord/schema/domain/eval-definition";
import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import type { TrialOutcome } from "@anpord/schema/domain/trial";
import { Clock, Context, Effect, Layer } from "effect";
import type { CredentialError } from "../credentials/errors";
import { CredentialResolver } from "../credentials/resolver";
import type {
  HarnessUnavailable,
  PrepareFailed,
  SandboxUnavailable,
  SourceUnavailable,
  UserUnavailable,
} from "../domain/errors";
import type { RequestedProfile } from "../domain/harness-profile";
import type { HarnessName } from "../domain/variant";
import { AUTO_STOP_MINUTES } from "../grid/trial";
import { AgentTrial, type AgentTrialResult } from "./agent-trial";

/* Names the operator rather than a person: the resolver a local run is given
   reads the environment, so there is no row for this to be scoped against. */
const LOCAL_ACTOR: Actor = {
  id: UserId.make("local"),
  isUser: false,
  organizationId: OrganizationId.make("local"),
  permissions: [],
};

/* One per trial, removed with it: a fixed path is isolated inside a provider's
   own VM, but on one machine it is shared, and a case would read what the last
   one left behind. */
const workspace = Effect.acquireRelease(
  Effect.promise(() => mkdtemp(join(tmpdir(), "anpord-workspace-"))),
  (made) => Effect.promise(() => rm(made, { force: true, recursive: true }))
);

/* A run on the machine that asked for it: no grid, no repositories, no cell.
   Everything the hosted path persists is returned to the caller instead. */
export interface LocalTrialRequest {
  readonly caseName: string;
  /** Read where the run was started, so a trial never reads the machine. */
  readonly forwarded?: Readonly<Record<string, string>>;
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly onProgress?: (
    events: readonly HarnessEvent[]
  ) => Effect.Effect<void>;
  readonly prepare?: EvalPrepare | null;
  readonly profile?: RequestedProfile | null;
  readonly prompt: string;
  readonly source: EvalSource;
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

export type LocalTrialError =
  | CredentialError
  | HarnessUnavailable
  | PrepareFailed
  | SandboxUnavailable
  | SourceUnavailable
  | UserUnavailable;

export interface LocalTrialsShape {
  readonly run: (
    request: LocalTrialRequest
  ) => Effect.Effect<LocalTrialOutcome, LocalTrialError>;
}

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
        const workspacePath = yield* workspace;

        const harnessCredential = yield* credentials.resolve({
          actor: LOCAL_ACTOR,
          integrationId: request.harness,
        });

        const result = yield* agent.run({
          autoStopMinutes: AUTO_STOP_MINUTES,
          forwarded: request.forwarded ?? {},
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
          workspace: workspacePath,
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
        Effect.scoped,
        Effect.withSpan("LocalTrials.run", {
          attributes: { case: request.caseName, harness: request.harness },
        })
      );

    return LocalTrials.of({ run });
  })
);
