import { Effect } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { SandboxHandle } from "../../ports/sandbox";

/**
 * The setup a freshly created sandbox needs, with the sandbox destroyed if it
 * fails.
 *
 * Without this the created id never leaves the closure that made it: the
 * effect fails carrying only the error, so the sandbox stays running with
 * nothing anywhere holding its id. The reaper works from ids recorded against
 * a trial, and one that was never recorded is unreachable forever.
 */
export const settingUp = <A>(
  setUp: Effect.Effect<A, SandboxUnavailable>,
  handle: SandboxHandle,
  destroy: () => Promise<unknown>
): Effect.Effect<SandboxHandle, SandboxUnavailable> =>
  setUp.pipe(
    Effect.as(handle),
    /* `tryPromise` rather than `promise`, because a provider that refuses the
       delete rejects, and a rejection reaching `promise` is a defect that
       `ignore` does not catch -- the open would die instead of failing with
       the reason the setup gave. */
    Effect.tapError(() =>
      Effect.tryPromise({ catch: (cause) => cause, try: destroy }).pipe(
        Effect.ignore
      )
    )
  );
