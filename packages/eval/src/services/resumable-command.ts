import { Clock, Context, Duration, Effect, Layer, Ref } from "effect";
import type { CommandOutcome } from "../adapters/sandbox/run-command";
import type { SandboxHandle } from "../ports/sandbox";

export interface SuspenderShape {
  readonly waitFor: (duration: Duration.Duration) => Effect.Effect<void>;
}

export class Suspender extends Context.Tag("@anpord/eval/Suspender")<
  Suspender,
  SuspenderShape
>() {}

export const SuspenderSleeping = Layer.succeed(
  Suspender,
  Suspender.of({ waitFor: (duration) => Effect.sleep(duration) })
);

const FIRST_CHECK_MS = 5000;
const SLOWEST_CHECK_MS = 30_000;
const WIDENING = 1.5;
const DEFAULT_TIMEOUT_MS = 120_000;

export const runResumable = (
  sandbox: SandboxHandle,
  command: string,
  options?: {
    readonly cwd?: string;
    readonly env?: Readonly<Record<string, string>>;
    readonly timeoutMs?: number;
  }
) =>
  Effect.gen(function* () {
    const suspender = yield* Suspender;
    const started = yield* sandbox.start(command, options);

    const gap = yield* Ref.make(FIRST_CHECK_MS);

    /* Held here rather than handed to the provider, because the point of
       starting a command detached is that no call is left waiting on it: there
       is nothing for a provider-side timeout to interrupt. Without a deadline
       of its own the loop ends only when the command does. */
    const giveUpAt =
      (yield* Clock.currentTimeMillis) +
      (options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const settled = yield* Effect.iterate(
      { progress: yield* sandbox.progress(started), timedOut: false },
      {
        body: () =>
          Effect.gen(function* () {
            const millis = yield* Ref.getAndUpdate(gap, (current) =>
              Math.min(Math.round(current * WIDENING), SLOWEST_CHECK_MS)
            );

            yield* suspender.waitFor(Duration.millis(millis));

            return {
              progress: yield* sandbox.progress(started),
              timedOut: (yield* Clock.currentTimeMillis) >= giveUpAt,
            };
          }),
        while: ({ progress, timedOut }) =>
          progress.exitCode === null && !timedOut,
      }
    );

    /* Reported as a failed command rather than a defect: a prepare that runs
       long is the case's own problem, and the output it produced before the
       deadline is what says why. */
    return settled.timedOut && settled.progress.exitCode === null
      ? ({
          exitCode: 1,
          stderr: `${settled.progress.stderr}\ntimed out after ${options?.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`,
          stdout: settled.progress.stdout,
        } satisfies CommandOutcome)
      : ({
          exitCode: settled.progress.exitCode ?? 1,
          stderr: settled.progress.stderr,
          stdout: settled.progress.stdout,
        } satisfies CommandOutcome);
  }).pipe(
    Effect.withSpan("Sandbox.runResumable", {
      attributes: { sandboxId: sandbox.id },
    })
  );
