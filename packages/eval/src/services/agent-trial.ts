import type {
  CredentialValues,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import type { EvalPrepare, EvalValidator } from "@anpord/schema/domain/evals";
import {
  Chunk,
  Clock,
  Context,
  Effect,
  Layer,
  Option,
  type Redacted,
  Ref,
  Stream,
} from "effect";
import { cacheKeyOf } from "../domain/cache-key";
import type { HarnessName, ProviderName } from "../domain/cell";
import type {
  HarnessUnavailable,
  PrepareFailed,
  SandboxUnavailable,
  SourceUnavailable,
} from "../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import {
  type RequestedProfile,
  SYSTEM_PROMPT_PATH,
} from "../domain/harness-profile";
import {
  commandsIn,
  failedCommandsIn,
  filesIn,
  sessionIdOf,
} from "../domain/journal";
import type { TrialOutcome } from "../domain/trial";
import type { WorkspaceSource } from "../domain/workspace-source";
import { Harnesses } from "../ports/harness";
import { SandboxProvider } from "../ports/sandbox";
import { Scorer } from "../ports/scorer";
import type { TrialProgressShape } from "../ports/trial-progress";
import { Suspender } from "./resumable-command";
import { progressSink } from "./trial-progress-sink";
import { prepareWorkspace } from "./workspace";

export interface AgentTrialRequest {
  readonly autoStopMinutes: number;
  /** What this case keeps between runs, restored before its prepare and
   * saved after it succeeds. */
  readonly caseCache?: { readonly key: string; readonly path: string };

  readonly harness: HarnessName;
  readonly harnessCredential: Redacted.Redacted<ResolvedCredential>;
  readonly harnessVersion: string;
  readonly model: string;

  readonly onSandbox?: (sandboxId: string) => Effect.Effect<void>;
  readonly organizationId: string;
  readonly prepare: EvalPrepare | null;
  readonly priorSandboxId?: string;
  readonly profile?: RequestedProfile | null;
  readonly progress?: TrialProgressShape;
  readonly prompt: string;
  readonly provider: ProviderName;
  readonly sandboxCredentials?: Redacted.Redacted<CredentialValues>;
  readonly source: WorkspaceSource;
  readonly sourceToken?: Redacted.Redacted<string> | undefined;

  readonly validator?: EvalValidator | null;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

export interface AgentTrialResult {
  readonly commands: number;
  readonly events: readonly HarnessEvent[];
  readonly failedCommands: number;
  readonly filesChanged: readonly string[];
  readonly outcome: TrialOutcome;
  readonly prepared: Readonly<Record<string, unknown>>;
  readonly sandboxId: string;
  readonly sessionId: string | null;
  readonly usage: Option.Option<HarnessUsage>;
}

export interface AgentTrialShape {
  readonly run: (
    request: AgentTrialRequest
  ) => Effect.Effect<
    AgentTrialResult,
    HarnessUnavailable | SandboxUnavailable | PrepareFailed | SourceUnavailable
  >;
}

export class AgentTrial extends Context.Tag("@anpord/eval/AgentTrial")<
  AgentTrial,
  AgentTrialShape
>() {}

/* A journal with a hole in it cannot support a verdict. */
const voided = (outcome: TrialOutcome): TrialOutcome => ({
  ...outcome,
  passed: false,
  status: "void",
  voidFields: [...outcome.voidFields, "journal"],
});

export const AgentTrialLive = Layer.effect(
  AgentTrial,
  Effect.gen(function* () {
    const harnesses = yield* Harnesses;
    const sandboxes = yield* SandboxProvider;
    const scorer = yield* Scorer;
    const suspender = yield* Suspender;

    const destroyPrior = (request: AgentTrialRequest) =>
      request.priorSandboxId === undefined
        ? Effect.void
        : sandboxes
            .destroy({
              credentials: request.sandboxCredentials,
              id: request.priorSandboxId,
              provider: request.provider,
            })
            .pipe(Effect.ignoreLogged);

    const run = (request: AgentTrialRequest) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;

        yield* destroyPrior(request);

        const sandbox = yield* sandboxes.open({
          autoStopMinutes: request.autoStopMinutes,
          cache: cacheKeyOf(request.organizationId, request.prepare),
          credentials: request.sandboxCredentials,
          provider: request.provider,
          workspace: request.workspace,
        });

        yield* request.onSandbox?.(sandbox.id) ?? Effect.void;

        const driver = yield* harnesses.resolve(request.harness);
        const profile = Option.fromNullable(request.profile);

        const { env, prepared } = yield* prepareWorkspace({
          /* The same name the volume has: what a prepare left last time it ran
             this way, before it has told us anything narrower. */
          caseCache: request.caseCache,
          credential: request.harnessCredential,
          driver,
          harness: request.harness,
          harnessVersion: request.harnessVersion,
          home: sandbox.home,
          sandbox,
          prepare: request.prepare,
          profile,
          source: request.source,
          sourceToken: request.sourceToken,
          workspace: request.workspace,
        }).pipe(Effect.provideService(Suspender, suspender));

        const modelStarted = yield* Clock.currentTimeMillis;

        const session = yield* driver.run({
          env,
          harness: request.harness,
          harnessVersion: request.harnessVersion,
          model: request.model,
          profile,
          prompt: request.prompt,
          sandbox,
          systemPromptPath: profile.pipe(
            Option.filter((found) => found.systemPrompt !== null),
            Option.map(() => `${sandbox.home}/${SYSTEM_PROMPT_PATH}`)
          ),
          workspace: request.workspace,
        });

        const sink = yield* progressSink(request.progress?.append);

        const events = Chunk.toReadonlyArray(
          yield* session.events.pipe(sink.through, Stream.runCollect)
        );

        const modelFinished = yield* Clock.currentTimeMillis;

        const scored = yield* scorer.score({
          commandCount: commandsIn(events),
          events,
          modelMs: modelFinished - modelStarted,
          sandbox,
          prepared,
          validator: request.validator,
          verifyCommand: request.verifyCommand,
          workspace: request.workspace,
        });

        const finishedAt = yield* Clock.currentTimeMillis;
        const journalLost = yield* Ref.get(sink.lost);

        return {
          commands: commandsIn(events),
          events,
          failedCommands: failedCommandsIn(events),
          filesChanged: filesIn(events),
          outcome: {
            ...(journalLost ? voided(scored) : scored),

            sandboxMs: finishedAt - startedAt - (modelFinished - modelStarted),
          },
          prepared,
          sandboxId: sandbox.id,
          sessionId: sessionIdOf(events),
          usage: yield* session.usage,
        } satisfies AgentTrialResult;
      }).pipe(
        Effect.scoped,
        Effect.withSpan("AgentTrial.run", {
          attributes: {
            harness: request.harness,
            model: request.model,
            provider: request.provider,
          },
        }),
        Effect.annotateLogs({
          harness: request.harness,
          provider: request.provider,
        })
      );

    return AgentTrial.of({ run });
  })
);
