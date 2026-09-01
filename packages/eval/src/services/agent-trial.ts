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
  type Option,
  type Redacted,
  Ref,
  Schedule,
  Stream,
} from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import type {
  HarnessUnavailable,
  PrepareFailed,
  SandboxUnavailable,
  SourceUnavailable,
} from "../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
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

const noReport = () => Effect.void;

import { cacheKeyOf } from "../domain/cache-key";
import { Suspender } from "./resumable-command";
import { prepareWorkspace } from "./workspace";

const PROGRESS_BATCH = 32;
const PROGRESS_WINDOW = "400 millis";

const PROGRESS_RETRY = Schedule.exponential("100 millis").pipe(
  Schedule.compose(Schedule.recurs(1))
);

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

export const AgentTrialLive = Layer.effect(
  AgentTrial,
  Effect.gen(function* () {
    const harnesses = yield* Harnesses;
    const sandboxes = yield* SandboxProvider;
    const scorer = yield* Scorer;
    const suspender = yield* Suspender;

    const run = (request: AgentTrialRequest) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;

        const sandbox = yield* sandboxes.open({
          autoStopMinutes: request.autoStopMinutes,
          cache: cacheKeyOf(request.organizationId, request.prepare),
          credentials: request.sandboxCredentials,
          provider: request.provider,
          workspace: request.workspace,
        });

        yield* request.onSandbox?.(sandbox.id) ?? Effect.void;

        const driver = yield* harnesses.resolve(request.harness);

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
          prompt: request.prompt,
          sandbox,
          workspace: request.workspace,
        });

        const reported = yield* Ref.make(0);

        const events = Chunk.toReadonlyArray(
          yield* session.events.pipe(
            Stream.groupedWithin(PROGRESS_BATCH, PROGRESS_WINDOW),
            Stream.tap((batch) =>
              Ref.get(reported).pipe(
                Effect.flatMap((from) =>
                  (request.progress?.append ?? noReport)(
                    Chunk.toReadonlyArray(batch),
                    from
                  ).pipe(
                    Effect.retry(PROGRESS_RETRY),
                    Effect.zipRight(Ref.set(reported, from + batch.length))
                  )
                ),
                Effect.catchAllCause((cause) =>
                  Effect.logWarning("trial progress not recorded", cause).pipe(
                    Effect.annotateLogs({
                      harness: request.harness,
                      model: request.model,
                      provider: request.provider,
                    })
                  )
                )
              )
            ),
            Stream.flattenChunks,
            Stream.runCollect
          )
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

        return {
          commands: commandsIn(events),
          events,
          failedCommands: failedCommandsIn(events),
          filesChanged: filesIn(events),
          outcome: {
            ...scored,

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
