import { metadata } from "@trigger.dev/sdk";
import { Effect, Layer } from "effect";
import { RunBell } from "../../ports/run-bell";

const TICK = "tick";

export const RunBellTrigger = Layer.succeed(
  RunBell,
  RunBell.of({
    ring: Effect.sync(() => metadata.increment(TICK, 1)).pipe(
      Effect.asVoid,
      Effect.catchAllDefect((defect) =>
        Effect.logWarning("could not ring the run's bell", defect)
      )
    ),
  })
);
