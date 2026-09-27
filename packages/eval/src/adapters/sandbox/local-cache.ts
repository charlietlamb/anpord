import { cp, rm } from "node:fs/promises";
import { Effect } from "effect";
import type { SandboxCache } from "../../ports/sandbox";
import { markUsed } from "./local-prune";
import { entryIn, pathExists, publishOnce } from "./local-publish";
import { providerCall } from "./provider-adapter";

const call = providerCall("local");

export const localCache = (store: string, staging: string): SandboxCache => ({
  has: (key) => pathExists(entryIn(store, key)),
  restore: (key, path) =>
    Effect.gen(function* () {
      const entry = entryIn(store, key);

      if (!(yield* pathExists(entry))) {
        return false;
      }

      yield* call(() => rm(path, { force: true, recursive: true }));
      yield* call(() => cp(entry, path, { recursive: true }));
      yield* markUsed(entry);

      return true;
    }),
  save: (key, path) =>
    publishOnce(staging, entryIn(store, key), (staged) =>
      call(() => cp(path, staged, { recursive: true }))
    ),
});
