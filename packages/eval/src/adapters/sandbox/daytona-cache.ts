import type { Daytona } from "@daytonaio/sdk";
import { Duration, Effect } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { SandboxCache } from "../../ports/sandbox";
import { quoted, unavailable } from "./daytona-shell";

export const CACHE_PATH = "/anpord-cache";
export const CACHE_SECONDS = 900;
const VOLUME_CHECK_MS = 1000;
const VOLUME_CHECKS = 60;

/* A volume is created asynchronously, and mounting one that is still
   pending_create fails the sandbox rather than waiting for it. */
export const readyVolume = (daytona: Daytona, name: string) =>
  Effect.iterate(
    { attempts: 0, volume: null as { id: string; state?: string } | null },
    {
      body: ({ attempts }) =>
        Effect.gen(function* () {
          if (attempts > 0) {
            yield* Effect.sleep(Duration.millis(VOLUME_CHECK_MS));
          }

          const volume = yield* Effect.tryPromise({
            catch: unavailable,
            try: () => daytona.volume.get(name, true),
          });

          return { attempts: attempts + 1, volume };
        }),
      while: ({ attempts, volume }) =>
        attempts < VOLUME_CHECKS && volume?.state !== "ready",
    }
  ).pipe(
    Effect.flatMap(({ volume }) =>
      volume === null
        ? Effect.fail(unavailable("the cache volume never became ready"))
        : Effect.succeed(volume)
    )
  );

/* What actions/cache passes, for the reasons it gives: every core, and a
   1GiB window, which is what finds the duplication a dependency tree is full
   of. */
const ZSTD_WRITE = "zstd -T0 --long=30";
const ZSTD_READ = "zstd -d --long=30";

/* Percent-encoded so a key cannot name a path, and the percents themselves
   replaced because they are awkward in a shell. */
const entryFor = (key: string) =>
  `${CACHE_PATH}/${encodeURIComponent(key).replaceAll("%", "_")}`;

export type CacheShell = (
  command: string
) => Effect.Effect<
  { readonly exitCode: number; readonly result: string },
  SandboxUnavailable
>;

/**
 * The cache as the mounted volume can actually provide it.
 *
 * The volume is object storage: it takes and returns whole files but cannot
 * rename or hard link, so an entry is committed by writing its manifest last.
 * A restore trusts nothing without one, which is what makes a save that died
 * partway a miss rather than a half-restored directory.
 */
export const cacheOn = (run: CacheShell): SandboxCache => {
  const manifest = (key: string) =>
    run(`cat ${quoted(`${entryFor(key)}/manifest.json`)} 2>/dev/null`).pipe(
      Effect.map(({ exitCode, result }) =>
        exitCode === 0 && result.trim() !== "" ? result.trim() : null
      )
    );

  const digest = (key: string) =>
    run(
      `sha256sum < ${quoted(`${entryFor(key)}/archive.tar.zst`)} | cut -d' ' -f1`
    ).pipe(
      Effect.map(({ exitCode, result }) =>
        exitCode === 0 ? result.trim() : null
      )
    );

  return {
    has: (key) => manifest(key).pipe(Effect.map((found) => found !== null)),
    restore: (key, path) =>
      Effect.gen(function* () {
        const stored = yield* manifest(key);

        if (stored === null) {
          return false;
        }

        const written = yield* digest(key);

        if (written === null || !stored.includes(written)) {
          return false;
        }

        const { exitCode } = yield* run(
          `rm -rf ${quoted(path)} && mkdir -p ${quoted(path)} && tar --use-compress-program=${quoted(ZSTD_READ)} -xf ${quoted(`${entryFor(key)}/archive.tar.zst`)} -C ${quoted(path)}`
        );

        if (exitCode !== 0) {
          yield* run(`rm -rf ${quoted(path)}`);
          return false;
        }

        return true;
      }),
    save: (key, path) =>
      Effect.gen(function* () {
        /* Write-once: the first sandbox to finish owns the key, and a second
           preparing the same way leaves it alone rather than writing over an
           entry another may be reading. */
        if (yield* manifest(key).pipe(Effect.map((f) => f !== null))) {
          return;
        }

        const entry = entryFor(key);
        const archive = `${entry}/archive.tar.zst`;

        const written = yield* run(
          `mkdir -p ${quoted(entry)} && tar --use-compress-program=${quoted(ZSTD_WRITE)} -cf ${quoted(archive)} -C ${quoted(path)} .`
        );

        if (written.exitCode !== 0) {
          yield* run(`rm -f ${quoted(archive)}`);
          return;
        }

        const stamp = yield* digest(key);

        if (stamp === null) {
          yield* run(`rm -f ${quoted(archive)}`);
          return;
        }

        /* Last, and the only thing a restore trusts. */
        yield* run(
          `printf '{"digest":"%s"}' ${quoted(stamp)} > ${quoted(`${entry}/manifest.json`)}`
        );
      }).pipe(Effect.asVoid),
  };
};
