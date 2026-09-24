import { cp, mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Effect } from "effect";
import type { SandboxCache } from "../../ports/sandbox";
import { providerCall } from "./provider-adapter";

const call = providerCall("local");

const entryFor = (store: string, key: string) =>
  join(store, encodeURIComponent(key).replaceAll("%", "_"));

const exists = (path: string) =>
  Effect.tryPromise(() => stat(path)).pipe(
    Effect.as(true),
    Effect.orElseSucceed(() => false)
  );

export const localCache = (store: string): SandboxCache => ({
  has: (key) => exists(entryFor(store, key)),
  restore: (key, path) =>
    Effect.gen(function* () {
      const entry = entryFor(store, key);

      if (!(yield* exists(entry))) {
        return false;
      }

      yield* call(() => rm(path, { force: true, recursive: true }));
      yield* call(() => cp(entry, path, { recursive: true }));

      return true;
    }),
  save: (key, path) =>
    Effect.gen(function* () {
      const entry = entryFor(store, key);

      if (yield* exists(entry)) {
        return;
      }

      yield* call(() => mkdir(store, { recursive: true }));
      yield* call(() => cp(path, entry, { recursive: true }));
    }),
});
