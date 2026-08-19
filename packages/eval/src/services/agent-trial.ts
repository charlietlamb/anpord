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
import { outcomeOf, type TrialOutcome } from "../domain/trial";
import { authenticateCodex, installCodex } from "../harness/codex-install";
import type { HarnessEvent, HarnessUsage } from "../ports/harness";
import { HarnessRunner } from "../ports/harness";
import { SandboxProvider } from "../ports/sandbox";

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
  readonly filesChanged: readonly string[];
  readonly outcome: TrialOutcome;
  readonly sandboxId: string;
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

const commandsIn = (events: readonly HarnessEvent[]) =>
  events.filter((event) => event._tag === "Command").length;

const filesIn = (events: readonly HarnessEvent[]) => [
  ...new Set(
    events.flatMap((event) => (event._tag === "FileChange" ? event.paths : []))
  ),
];

export const AgentTrialLive = Layer.effect(
  AgentTrial,
  Effect.gen(function* () {
    const harnesses = yield* HarnessRunner;
    const sandboxes = yield* SandboxProvider;

    const run = (request: AgentTrialRequest) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;

        const sandbox = yield* sandboxes.open({
          autoStopMinutes: request.autoStopMinutes,
          provider: request.provider,
          workspace: request.workspace,
        });

        yield* installCodex(sandbox, request.harnessVersion);
        yield* authenticateCodex(sandbox, request.credentials, request.home);

        for (const [path, content] of Object.entries(request.files)) {
          yield* sandbox.writeFile(`${request.workspace}/${path}`, content);
        }

        if (request.setupCommand !== null) {
          yield* Stream.runDrain(
            sandbox.exec(request.setupCommand, {
              timeoutMs: 300_000,
            })
          );
        }

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

        /* Scored by running the verifier ourselves rather than by reading what
           the agent said it achieved. Codex reports its own commands and their
           exit codes, and a harness that fooled itself with a pipeline would
           report success while the tests failed. */
        const verify = yield* Stream.runCollect(
          sandbox.exec(request.verifyCommand, { timeoutMs: 300_000 })
        );
        const chunks = Chunk.toReadonlyArray(verify);
        const exit = chunks.find((chunk) => chunk.stream === "exit");
        const output = chunks
          .filter((chunk) => chunk.stream !== "exit")
          .map((chunk) => chunk.data)
          .join("");

        const exitCode = exit === undefined ? 1 : exit.exitCode;
        const finishedAt = yield* Clock.currentTimeMillis;

        return {
          commands: commandsIn(events),
          events,
          filesChanged: filesIn(events),
          outcome: outcomeOf({
            commandCount: commandsIn(events),
            exitCode,
            fingerprint: {
              verify:
                output.trim() === "" && exit !== undefined
                  ? `exited ${exitCode}`
                  : output,
            },
            modelMs: modelFinished - modelStarted,
            sandboxMs: finishedAt - startedAt - (modelFinished - modelStarted),
          }),
          sandboxId: sandbox.id,
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
