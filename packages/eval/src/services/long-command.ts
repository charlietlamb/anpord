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
  /** Called with what a command has printed since the last check, when it
   * printed anything. A command that runs for half an hour says nothing at
   * all otherwise. */
  readonly watch?: (text: string) => Effect.Effect<void>;
}

/**
 * A command long enough to be worth not waiting on.
 *
 * A provider that resumes commands starts one detached and is polled for it,
 * so the run can suspend between checks. One that does not gets a streamed
 * `exec` instead: the same outcome and the same `watch`, reported as the
 * output arrives rather than by polling, at the cost of holding the call open
 * for as long as the command runs.
 *
 * The fallback lives here rather than behind the port because the port is
 * where a provider says what it can do, and a `start` faked from a stream
 * would let a provider claim a capability it does not have. Callers branch on
 * nothing either way: both paths return one `CommandOutcome`.
 */
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
