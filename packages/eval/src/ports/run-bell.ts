import { Context, Effect, Layer } from "effect";

export interface RunBellShape {
  readonly ring: Effect.Effect<void>;
}

export class RunBell extends Context.Tag("@sphynx/eval/RunBell")<
  RunBell,
  RunBellShape
>() {}

export const RunBellSilent = Layer.succeed(
  RunBell,
  RunBell.of({ ring: Effect.void })
);
