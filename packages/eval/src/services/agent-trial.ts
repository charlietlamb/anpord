import type {
  CredentialValues,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import type { EvalTurn } from "@anpord/schema/domain/eval-conversation";
import type {
  EvalPrepare,
  EvalSource,
  EvalValidator,
} from "@anpord/schema/domain/eval-definition";
import {
  DEFAULT_MAX_TURNS,
  DEFAULT_TIMEOUT_MS,
} from "@anpord/schema/domain/eval-limits";
import type { EvalArtifact } from "@anpord/schema/domain/eval-trial";
import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import type {
  HarnessEvent,
  HarnessUsage,
  ModelSpend,
} from "@anpord/schema/domain/harness-event";
import type { TrialOutcome } from "@anpord/schema/domain/trial";
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
import { CredentialResolver } from "../credentials/resolver";
import { cacheKeyOf } from "../domain/cache-key";
import type {
  HarnessUnavailable,
  PrepareFailed,
  SandboxUnavailable,
  SourceUnavailable,
  TrialTimedOut,
} from "../domain/errors";
import { UserUnavailable } from "../domain/errors";
import type { RequestedProfile } from "../domain/harness-profile";
import { waitingOutCapacity } from "../domain/harness-retry";
import {
  commandsIn,
  failedCommandsIn,
  filesIn,
  sessionIdOf,
} from "../domain/journal";
import { trialSecrets } from "../domain/trial-secrets";
import { reportsWholeSession, throughRun } from "../domain/usage-tally";
import type { HarnessName, SandboxName } from "../domain/variant";
import { Harnesses } from "../ports/harness";
import { SandboxProvider } from "../ports/sandbox";
import { Scorer, type ValidationObserver } from "../ports/scorer";
import { SimulatedUser } from "../ports/simulated-user";
import type { TrialProgressShape } from "../ports/trial-progress";
import { captureArtifacts } from "./capture-artifacts";
import { converse, spokenThrough } from "./conversation";
import { captureCredentialRotation } from "./credential-rotation";
import { apiInstructions } from "./mock-apis";
import { systemPromptPath } from "./profile-files";
import { Suspender } from "./suspender";
import { progressSink } from "./trial-progress-sink";
import { turnBudget } from "./turn-budget";
import { prepareWorkspace } from "./workspace";

export interface AgentTrialRequest {
  readonly autoStopMinutes: number;
  /** What this case keeps between runs, restored before its prepare and
   * saved after it succeeds. */
  readonly caseCache?: { readonly key: string; readonly path: string };

  /** Host variables to forward, already read: the machine is read where the
   * run is started, never from inside a trial. */
  readonly forwarded?: Readonly<Record<string, string>>;
  readonly harness: HarnessName;
  readonly harnessCredential: Redacted.Redacted<ResolvedCredential>;
  readonly harnessVersion: string;
  readonly maxTurns?: number | null;
  readonly model: string;

  readonly onSandbox?: (sandboxId: string) => Effect.Effect<void>;
  readonly onValidation?: ValidationObserver;
  readonly organizationId: string;
  readonly prepare: EvalPrepare | null;
  readonly priorSandboxId?: string;
  readonly profile: RequestedProfile | null;
  readonly progress?: TrialProgressShape;
  readonly prompt: string;
  readonly provider: SandboxName;
  readonly sandboxCredentials?: Redacted.Redacted<CredentialValues>;
  readonly source: EvalSource;
  readonly sourceToken?: Redacted.Redacted<string> | undefined;
  readonly timeoutMs?: number | null;
  readonly user?: EvalUser | null;

  readonly validator?: EvalValidator | null;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

export interface AgentTrialResult {
  readonly artifactContents?: readonly EvalArtifact[];
  readonly commands: number;
  readonly conversationEvents: readonly HarnessEvent[];
  readonly events: readonly HarnessEvent[];
  readonly failedCommands: number;
  readonly filesChanged: readonly string[];
  readonly outcome: TrialOutcome;
  readonly prepared: Readonly<Record<string, unknown>>;
  readonly sandboxId: string;
  readonly sessionId: string | null;
  readonly turns: readonly EvalTurn[];
  readonly usage: Option.Option<HarnessUsage>;
  readonly userSpend: Option.Option<ModelSpend>;
}

export interface AgentTrialShape {
  readonly run: (
    request: AgentTrialRequest
  ) => Effect.Effect<
    AgentTrialResult,
    | HarnessUnavailable
    | SandboxUnavailable
    | PrepareFailed
    | SourceUnavailable
    | TrialTimedOut
    | UserUnavailable
  >;
}

export class AgentTrial extends Context.Tag("@anpord/eval/AgentTrial")<
  AgentTrial,
  AgentTrialShape
>() {}

/* A journal with a hole in it cannot support a verdict. */
const voided = (outcome: TrialOutcome): TrialOutcome => ({
  ...outcome,
  status: "void",
  voidFields: [...outcome.voidFields, "journal"],
});

export const AgentTrialLive = Layer.effect(
  AgentTrial,
  Effect.gen(function* () {
    const human = yield* SimulatedUser;
    const credentials = yield* CredentialResolver;
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
        const secrets = trialSecrets(request);

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
        const sink = yield* progressSink(request.progress?.append);

        const { env, prepared, api } = yield* prepareWorkspace({
          /* The same name the volume has: what a prepare left last time it ran
             this way, before it has told us anything narrower. */
          caseCache: request.caseCache,
          credential: request.harnessCredential,
          driver,
          forwarded: request.forwarded ?? {},
          harness: request.harness,
          harnessVersion: request.harnessVersion,
          home: sandbox.home,
          model: request.model,
          profile: request.profile,
          prepare: request.prepare,
          sandbox,
          secrets,
          source: request.source,
          sourceToken: request.sourceToken,
          workspace: request.workspace,
        }).pipe(Effect.provideService(Suspender, suspender));

        /* Before the sandbox is released, so a token the harness refreshed in
           there replaces the spent one we stored. */
        yield* Effect.addFinalizer(() =>
          captureCredentialRotation({
            credential: request.harnessCredential,
            credentials,
            driver,
            home: sandbox.home,
            organizationId: request.organizationId,
            profile,
            sandbox,
            version: request.harnessVersion,
          })
        );

        yield* Effect.addFinalizer(() =>
          api.collect().pipe(Effect.flatMap(sink.record), Effect.ignoreLogged)
        );

        const modelStarted = yield* Clock.currentTimeMillis;

        const tallied = yield* Ref.make(Option.none<HarnessUsage>());
        const budgeted = yield* turnBudget(
          request.timeoutMs ?? DEFAULT_TIMEOUT_MS
        );
        const turn = (prompt: string, resume: Option.Option<string>) =>
          budgeted((timeout) =>
            driver
              .run({
                env,
                harness: request.harness,
                harnessVersion: request.harnessVersion,
                resume,
                model: request.model,
                profile,
                prompt,
                sandbox,
                systemPromptPath: profile.pipe(
                  Option.filter((found) => found.systemPrompt !== null),
                  Option.map(() => systemPromptPath(sandbox.home))
                ),
                timeout,
                workspace: request.workspace,
              })
              .pipe(
                waitingOutCapacity(request.model),
                Effect.flatMap((session) =>
                  session.events
                    .pipe(sink.through, Stream.runCollect)
                    .pipe(
                      Effect.tap(() =>
                        Effect.flatMap(session.usage, (usage) =>
                          Ref.update(tallied, (carried) =>
                            throughRun(
                              carried,
                              usage,
                              reportsWholeSession(driver.resume, resume)
                            )
                          )
                        )
                      )
                    )
                ),
                Effect.map(Chunk.toReadonlyArray)
              )
          );

        const conversation = yield* converse({
          context: {
            autoStopMinutes: request.autoStopMinutes,
            harnessCredential: request.harnessCredential,
            organizationId: request.organizationId,
            provider: request.provider,
            sandboxCredentials: request.sandboxCredentials,
          },
          maxTurns: request.maxTurns ?? DEFAULT_MAX_TURNS,
          opening: request.prompt + apiInstructions(api.manifest),
          run: spokenThrough(sink, turn),
          user: request.user ?? null,
        }).pipe(Effect.provideService(SimulatedUser, human));

        /* A case that states a human and then holds no conversation measured
           nothing: scoring it would report the setup failure as a verdict. */
        if (conversation.ended === "no-user") {
          return yield* new UserUnavailable({ reason: conversation.reason });
        }

        const apiEvents = yield* api.collect();
        yield* sink.record(apiEvents);
        yield* api.check;
        const events = [...conversation.events, ...apiEvents];

        const modelFinished = yield* Clock.currentTimeMillis;

        const artifacts = yield* captureArtifacts(
          sandbox,
          request.workspace,
          filesIn(events),
          secrets
        );
        const scored = yield* scorer.score({
          onValidation: request.onValidation,
          commandCount: commandsIn(events),
          env: request.forwarded,
          events,
          modelMs: modelFinished - modelStarted,
          sandbox,
          secrets,
          turns: conversation.turns,
          prepared,
          validator: request.validator,
          verifyCommand: request.verifyCommand,
          workspace: request.workspace,
        });
        const validationApiEvents = yield* api.collect();
        yield* sink.record(validationApiEvents);
        yield* api.check;

        const finishedAt = yield* Clock.currentTimeMillis;
        const journalLost = yield* Ref.get(sink.lost);

        return {
          artifactContents: artifacts,
          commands: commandsIn(events),
          conversationEvents: conversation.events,
          events: [...events, ...validationApiEvents],
          failedCommands: failedCommandsIn(events),
          filesChanged: filesIn(events),
          outcome: {
            ...(journalLost ? voided(scored) : scored),
            artifacts: artifacts.map(
              ({ content: _content, ...metadata }) => metadata
            ),

            sandboxMs: finishedAt - startedAt - (modelFinished - modelStarted),
          },
          prepared,
          sandboxId: sandbox.id,
          sessionId: sessionIdOf(events),
          turns: conversation.turns,
          usage: yield* Ref.get(tallied),
          userSpend: conversation.userSpend,
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
