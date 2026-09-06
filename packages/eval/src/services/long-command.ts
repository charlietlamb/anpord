import { Effect, Option } from "effect";
import { runCommandForOutcome } from "../adapters/sandbox/run-command";
import type { SandboxHandle } from "../ports/sandbox";
import { pollUntilDone } from "./polled-command";
import { Suspender } from "./suspender";

const DEFAULT_TIMEOUT_MS = 120_000;

export interface LongCommandOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
  /* Called with output since the last check, when there was any. */
  readonly watch?: (text: string) => Effect.Effect<void>;
}

/* The streamed fallback lives here, not behind the port: a `start` faked from a
   stream would let a provider claim a capability it does not have. */
export const runLongCommand = (
  sandbox: SandboxHandle,
  command: string,
  options?: LongCommandOptions
) =>
  Effect.gen(function* () {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const exec = { cwd: options?.cwd, env: options?.env, timeoutMs };
    const resumable = sandbox.resumable;

    if (Option.isNone(resumable)) {
      return yield* runCommandForOutcome(sandbox, command, {
        ...exec,
        watch: options?.watch,
      });
    }

    const suspender = yield* Suspender;

    return yield* pollUntilDone({
      command,
      options: exec,
      resumable: resumable.value,
      suspender,
      timeoutMs,
      watch: options?.watch,
    });
  }).pipe(
    Effect.withSpan("Sandbox.runLongCommand", {
      attributes: {
        resumable: Option.isSome(sandbox.resumable),
        sandboxId: sandbox.id,
      },
    })
  );
