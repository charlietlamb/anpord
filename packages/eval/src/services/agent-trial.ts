import type {
  CredentialValues,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import type {
  EvalArtifact,
  EvalPrepare,
  EvalValidator,
} from "@anpord/schema/domain/evals";
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
import type { HarnessName, ProviderName } from "../domain/cell";
import type {
  HarnessUnavailable,
  PrepareFailed,
  SandboxUnavailable,
  SourceUnavailable,
} from "../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import type { RequestedProfile } from "../domain/harness-profile";
import { waitingOutCapacity } from "../domain/harness-retry";
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
import { Scorer, type ValidationObserver } from "../ports/scorer";
import type { TrialProgressShape } from "../ports/trial-progress";
import { captureArtifacts } from "./capture-artifacts";
import { captureCredentialRotation } from "./credential-rotation";
import { apiInstructions } from "./mock-apis";
import { systemPromptPath } from "./profile-files";
import { Suspender } from "./suspender";
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
  readonly onValidation?: ValidationObserver;
  readonly organizationId: string;
  readonly prepare: EvalPrepare | null;
  readonly priorSandboxId?: string;
  readonly profile: RequestedProfile | null;
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
  readonly artifactContents?: readonly EvalArtifact[];
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
          harness: request.harness,
          harnessVersion: request.harnessVersion,
          home: sandbox.home,
          model: request.model,
          profile: request.profile,
          prepare: request.prepare,
          sandbox,
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
          api.collect().pipe(
            Effect.flatMap((events) =>
              Stream.fromIterable(events).pipe(sink.through, Stream.runDrain)
            ),
            Effect.ignoreLogged
          )
        );

        const modelStarted = yield* Clock.currentTimeMillis;
        const instructions = apiInstructions(api.manifest);
        const discovery: readonly HarnessEvent[] =
          instructions === ""
            ? []
            : [
                {
                  _tag: "Message",
                  at: modelStarted,
                  role: "user",
                  text: instructions.trim(),
                },
              ];
        yield* Stream.fromIterable(discovery).pipe(
          sink.through,
          Stream.runDrain
        );

        const session = yield* driver
          .run({
            env,
            harness: request.harness,
            harnessVersion: request.harnessVersion,
            model: request.model,
            profile,
            prompt: request.prompt + instructions,
            sandbox,
            systemPromptPath: profile.pipe(
              Option.filter((found) => found.systemPrompt !== null),
              Option.map(() => systemPromptPath(sandbox.home))
            ),
            workspace: request.workspace,
          })
          .pipe(waitingOutCapacity(request.model));

        const agentEvents = Chunk.toReadonlyArray(
          yield* session.events.pipe(sink.through, Stream.runCollect)
        );
        const apiEvents = yield* api.collect();
        yield* Stream.fromIterable(apiEvents).pipe(
          sink.through,
          Stream.runDrain
        );
        yield* api.check;
        const events = [...discovery, ...agentEvents, ...apiEvents];

        const modelFinished = yield* Clock.currentTimeMillis;

        const artifacts = yield* captureArtifacts(
          sandbox,
          request.workspace,
          filesIn(events)
        );
        const scored = yield* scorer.score({
          onValidation: request.onValidation,
          commandCount: commandsIn(events),
          events,
          modelMs: modelFinished - modelStarted,
          sandbox,
          prepared,
          validator: request.validator,
          verifyCommand: request.verifyCommand,
          workspace: request.workspace,
        });
        const validationApiEvents = yield* api.collect();
        yield* Stream.fromIterable(validationApiEvents).pipe(
          sink.through,
          Stream.runDrain
        );
        yield* api.check;

        const finishedAt = yield* Clock.currentTimeMillis;
        const journalLost = yield* Ref.get(sink.lost);

        return {
          artifactContents: artifacts,
          commands: commandsIn(events),
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
