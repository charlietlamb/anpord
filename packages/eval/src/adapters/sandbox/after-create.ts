import { Effect } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { SandboxHandle } from "../../ports/sandbox";

/* Without this the created id never leaves this closure, and the reaper only
   works from ids recorded against a trial. */
export const settingUp = <A>(
  setUp: Effect.Effect<A, SandboxUnavailable>,
  handle: SandboxHandle,
  destroy: () => Promise<unknown>
): Effect.Effect<SandboxHandle, SandboxUnavailable> =>
  setUp.pipe(
    Effect.as(handle),
    /* `tryPromise`, not `promise`: a rejection reaching `promise` is a defect
       `ignore` does not catch. */
    Effect.tapError(() =>
      Effect.tryPromise({ catch: (cause) => cause, try: destroy }).pipe(
        Effect.ignore
      )
    )
  );
