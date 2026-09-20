import { cp, mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Effect } from "effect";
import { SandboxUnavailable } from "../../domain/errors";
import type { SandboxCache } from "../../ports/sandbox";

const failed = (reason: unknown) =>
  new SandboxUnavailable({
    provider: "local",
    reason: reason instanceof Error ? reason.message : String(reason),
  });

/* Percent-encoded so a key cannot name a path, matching what the Daytona
   volume does with the same keys. */
const entryFor = (store: string, key: string) =>
  join(store, encodeURIComponent(key).replaceAll("%", "_"));

const exists = async (path: string) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

/* Somewhere a prepare can leave what it built, on the machine running the
   eval. Write-once like every provider's, so the same conformance suite
   proves it. */
export const localCache = (store: string): SandboxCache => ({
  has: (key) =>
    Effect.tryPromise({
      catch: failed,
      try: () => exists(entryFor(store, key)),
    }),
  restore: (key, path) =>
    Effect.tryPromise({
      catch: failed,
      try: async () => {
        const entry = entryFor(store, key);

        if (!(await exists(entry))) {
          return false;
        }

        await rm(path, { force: true, recursive: true });
        await cp(entry, path, { recursive: true });

        return true;
      },
    }),
  save: (key, path) =>
    Effect.tryPromise({
      catch: failed,
      try: async () => {
        const entry = entryFor(store, key);

        if (await exists(entry)) {
          return;
        }

        await mkdir(store, { recursive: true });
        await cp(path, entry, { recursive: true });
      },
    }),
});
