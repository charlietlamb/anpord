import { Context, Duration, Effect, Layer, Ref } from "effect";
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

    const settled = yield* Effect.iterate(yield* sandbox.progress(started), {
      body: () =>
        Effect.gen(function* () {
          const millis = yield* Ref.getAndUpdate(gap, (current) =>
            Math.min(Math.round(current * WIDENING), SLOWEST_CHECK_MS)
          );

          yield* suspender.waitFor(Duration.millis(millis));

          return yield* sandbox.progress(started);
        }),
      while: ({ exitCode }) => exitCode === null,
    });

    return {
      exitCode: settled.exitCode ?? 1,
      stderr: settled.stderr,
      stdout: settled.stdout,
    } satisfies CommandOutcome;
  }).pipe(
    Effect.withSpan("Sandbox.runResumable", {
      attributes: { sandboxId: sandbox.id },
    })
  );
