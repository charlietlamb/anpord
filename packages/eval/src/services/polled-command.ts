import { Clock, Duration, Effect, Ref, Schedule } from "effect";
import { type CommandOutcome, lastOf } from "../adapters/sandbox/run-command";
import type { ExecOptions, ResumableCommands } from "../ports/sandbox";
import type { SuspenderShape } from "./suspender";

const FIRST_CHECK_MS = 5000;
const SLOWEST_CHECK_MS = 30_000;
const WIDENING = 1.5;
const WATCHED_TAIL = 400;

/* A failed poll is not a failed command: one bad response would otherwise discard
   half an hour of sandbox work. */
const CHECK_RETRY = Schedule.exponential("200 millis").pipe(
  Schedule.compose(Schedule.recurs(3))
);

export interface PolledCommand {
  readonly command: string;
  readonly options: ExecOptions;
  readonly resumable: ResumableCommands;
  readonly suspender: SuspenderShape;
  readonly timeoutMs: number;
  readonly watch?: (text: string) => Effect.Effect<void>;
}

/* The deadline is held here: a detached command leaves no call for a
   provider-side timeout to interrupt. */
export const pollUntilDone = (input: PolledCommand) =>
  Effect.gen(function* () {
    const started = yield* input.resumable.start(input.command, input.options);

    const gap = yield* Ref.make(FIRST_CHECK_MS);
    const reported = yield* Ref.make(0);

    /* A poll returns the whole log from the beginning, so only the new tail is sent. */
    const report = (progress: { readonly stdout: string }) =>
      Ref.getAndSet(reported, progress.stdout.length).pipe(
        Effect.flatMap((seen) =>
          progress.stdout.length > seen && input.watch !== undefined
            ? input.watch(
                progress.stdout.slice(seen).slice(-WATCHED_TAIL).trim()
              )
            : Effect.void
        )
      );

    const check = input.resumable
      .progress(started)
      .pipe(Effect.retry(CHECK_RETRY));

    const giveUpAt = (yield* Clock.currentTimeMillis) + input.timeoutMs;

    const settled = yield* Effect.iterate(
      { progress: yield* check, timedOut: false },
      {
        body: () =>
          Effect.gen(function* () {
            const millis = yield* Ref.getAndUpdate(gap, (current) =>
              Math.min(Math.round(current * WIDENING), SLOWEST_CHECK_MS)
            );

            yield* input.suspender.waitFor(Duration.millis(millis));

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

    /* A failed command, not a defect: an over-long prepare is the case's problem.
       Truncated to the same tail a streamed command keeps. */
    return settled.timedOut && settled.progress.exitCode === null
      ? ({
          exitCode: 1,
          stderr: lastOf(
            `${settled.progress.stderr}\ntimed out after ${input.timeoutMs}ms`
          ),
          stdout: lastOf(settled.progress.stdout),
        } satisfies CommandOutcome)
      : ({
          exitCode: settled.progress.exitCode ?? 1,
          stderr: lastOf(settled.progress.stderr),
          stdout: lastOf(settled.progress.stdout),
        } satisfies CommandOutcome);
  });
