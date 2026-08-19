import {
  Chunk,
  Clock,
  Context,
  Effect,
  Layer,
  type Option,
  Stream,
} from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import type { HarnessUnavailable, SandboxUnavailable } from "../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import {
  commandsIn,
  failedCommandsIn,
  filesIn,
  sessionIdOf,
} from "../domain/journal";
import type { TrialOutcome } from "../domain/trial";
import { HarnessRunner } from "../ports/harness";
import { SandboxProvider } from "../ports/sandbox";
import { Scorer } from "../ports/scorer";
import { prepareWorkspace } from "./workspace";

export interface AgentTrialRequest {
  readonly autoStopMinutes: number;
  readonly credentials: string;
  readonly files: Readonly<Record<string, string>>;
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly home: string;
  readonly model: string;
  readonly prompt: string;
  readonly provider: ProviderName;
  readonly setupCommand: string | null;
  readonly verifyCommand: string;
  readonly workspace: string;
}

export interface AgentTrialResult {
  readonly commands: number;
  readonly events: readonly HarnessEvent[];
  readonly failedCommands: number;
  readonly filesChanged: readonly string[];
  readonly outcome: TrialOutcome;
  readonly sandboxId: string;
  readonly sessionId: string | null;
  readonly usage: Option.Option<HarnessUsage>;
}

export interface AgentTrialShape {
  readonly run: (
    request: AgentTrialRequest
  ) => Effect.Effect<
    AgentTrialResult,
    HarnessUnavailable | SandboxUnavailable,
    SandboxProvider
  >;
}

export class AgentTrial extends Context.Tag("@anpord/eval/AgentTrial")<
  AgentTrial,
  AgentTrialShape
>() {}

export const AgentTrialLive = Layer.effect(
  AgentTrial,
  Effect.gen(function* () {
    const harnesses = yield* HarnessRunner;
    const sandboxes = yield* SandboxProvider;
    const scorer = yield* Scorer;

    const run = (request: AgentTrialRequest) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;

        const sandbox = yield* sandboxes.open({
          autoStopMinutes: request.autoStopMinutes,
          provider: request.provider,
          workspace: request.workspace,
        });

        yield* prepareWorkspace({
          credentials: request.credentials,
          files: request.files,
          harnessVersion: request.harnessVersion,
          home: request.home,
          sandbox,
          setupCommand: request.setupCommand,
          workspace: request.workspace,
        });

        const modelStarted = yield* Clock.currentTimeMillis;

        const session = yield* harnesses.run({
          harness: request.harness,
          harnessVersion: request.harnessVersion,
          model: request.model,
          prompt: request.prompt,
          sandbox,
          workspace: request.workspace,
        });

        const events = Chunk.toReadonlyArray(
          yield* Stream.runCollect(session.events)
        );

        const modelFinished = yield* Clock.currentTimeMillis;

        /* Scored through the port rather than inline, so the verdict comes
           from running the verifier ourselves and inherits the refusal to
           score through an unguarded pipeline. A harness that fooled itself
           with `| tail` would otherwise report success while the tests
           failed. */
        const scored = yield* scorer.score({
          commandCount: commandsIn(events),
          modelMs: modelFinished - modelStarted,
          sandbox,
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
            /* Model time and sandbox time are separated here because the
               scorer only sees the verifier, and a slow provider would
               otherwise read as a slow model. */
            sandboxMs: finishedAt - startedAt - (modelFinished - modelStarted),
          },
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
