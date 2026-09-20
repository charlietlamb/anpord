import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Config, Effect } from "effect";

/* A harness reinstalls itself every trial, so what it downloads lives here
   rather than in the workspace that is deleted with the trial. The workspace
   stays per-trial: only the download is shared. */
export interface LocalRoots {
  readonly cache: string;
  readonly home: string;
}

const ensure = (path: string) =>
  Effect.tryPromise({
    catch: (cause) =>
      new Error(`local sandbox cannot use ${path}: ${String(cause)}`),
    try: () => mkdir(path, { recursive: true }),
  }).pipe(Effect.orDie, Effect.as(path));

export const localRoots: Effect.Effect<LocalRoots> = Effect.gen(function* () {
  const base = yield* Config.string("ANPORD_LOCAL_ROOT").pipe(
    Config.withDefault(join(homedir(), ".anpord", "local")),
    Effect.orDie
  );

  return {
    cache: yield* ensure(join(base, "cache")),
    home: yield* ensure(join(base, "home")),
  };
});
