import { Clock, Context, Duration, Effect, Layer, Ref, Schedule } from "effect";
import { type CommandOutcome, lastOf } from "../adapters/sandbox/run-command";
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
const WATCHED_TAIL = 400;

/* A check that fails is not a command that failed: the command runs in the
   sandbox, and one bad response says nothing about it. Without this a single
   provider blip discards work that may be half an hour old. */
const CHECK_RETRY = Schedule.exponential("200 millis").pipe(
  Schedule.compose(Schedule.recurs(3))
);

export const runResumable = (
  sandbox: SandboxHandle,
  command: string,
  options?: {
    readonly cwd?: string;
    readonly env?: Readonly<Record<string, string>>;
    readonly timeoutMs?: number;
    /** Called with what a command has printed since the last check, when it
     * printed anything. A command that runs for half an hour says nothing at
     * all otherwise. */
    readonly watch?: (text: string) => Effect.Effect<void>;
  }
) =>
  Effect.gen(function* () {
    const suspender = yield* Suspender;
    const started = yield* sandbox.start(command, options);

    const gap = yield* Ref.make(FIRST_CHECK_MS);
    const reported = yield* Ref.make(0);

    /* Only what is new, and only the tail of that: a poll returns the whole log
       from the beginning, so reporting it whole would repeat everything already
       said, every time. */
    const report = (progress: { readonly stdout: string }) =>
      Ref.getAndSet(reported, progress.stdout.length).pipe(
        Effect.flatMap((seen) =>
          progress.stdout.length > seen && options?.watch !== undefined
            ? options.watch(
                progress.stdout.slice(seen).slice(-WATCHED_TAIL).trim()
              )
            : Effect.void
        )
      );

    const check = sandbox.progress(started).pipe(Effect.retry(CHECK_RETRY));

    /* Held here rather than handed to the provider, because the point of
       starting a command detached is that no call is left waiting on it: there
       is nothing for a provider-side timeout to interrupt. Without a deadline
       of its own the loop ends only when the command does. */
    const giveUpAt =
      (yield* Clock.currentTimeMillis) +
      (options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const settled = yield* Effect.iterate(
      { progress: yield* check, timedOut: false },
      {
        body: () =>
          Effect.gen(function* () {
            const millis = yield* Ref.getAndUpdate(gap, (current) =>
              Math.min(Math.round(current * WIDENING), SLOWEST_CHECK_MS)
            );

            yield* suspender.waitFor(Duration.millis(millis));

            const progress = yield* check;

            yield* report(progress);

            return {
              progress,
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
    /* Truncated to the same tail a streamed command keeps: every poll returns
       the whole log from the beginning, so a chatty install would otherwise
       carry tens of megabytes into a stored prepare value or an error. */
    return settled.timedOut && settled.progress.exitCode === null
      ? ({
          exitCode: 1,
          stderr: lastOf(
            `${settled.progress.stderr}\ntimed out after ${options?.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`
          ),
          stdout: lastOf(settled.progress.stdout),
        } satisfies CommandOutcome)
      : ({
          exitCode: settled.progress.exitCode ?? 1,
          stderr: lastOf(settled.progress.stderr),
          stdout: lastOf(settled.progress.stdout),
        } satisfies CommandOutcome);
  }).pipe(
    Effect.withSpan("Sandbox.runResumable", {
      attributes: { sandboxId: sandbox.id },
    })
  );
