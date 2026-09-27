import { mkdtemp, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Effect } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import { providerCall } from "./provider-adapter";

const call = providerCall("local");

export const entryIn = (store: string, key: string) =>
  join(store, encodeURIComponent(key).replaceAll("%", "_"));

export const pathExists = (path: string) =>
  Effect.tryPromise(() => stat(path)).pipe(
    Effect.as(true),
    Effect.orElseSucceed(() => false)
  );

const discard = (path: string) =>
  Effect.promise(() => rm(path, { force: true, recursive: true }));

const claim = (staged: string, target: string) =>
  Effect.gen(function* () {
    const moved = yield* call(() => rename(staged, target)).pipe(
      Effect.as(true),
      Effect.catchAll((cause) =>
        Effect.flatMap(pathExists(target), (taken) =>
          taken ? Effect.succeed(false) : Effect.fail(cause)
        )
      )
    );

    if (!moved) {
      yield* discard(staged);
    }
  });

export const publishOnce = (
  staging: string,
  target: string,
  fill: (staged: string) => Effect.Effect<void, SandboxUnavailable>
): Effect.Effect<void, SandboxUnavailable> =>
  Effect.gen(function* () {
    if (yield* pathExists(target)) {
      return;
    }

    const staged = yield* call(() => mkdtemp(join(staging, "entry-")));

    yield* fill(staged).pipe(
      Effect.zipRight(claim(staged, target)),
      Effect.onError(() => discard(staged))
    );
  });
