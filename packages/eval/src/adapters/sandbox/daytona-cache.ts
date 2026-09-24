import type { Daytona } from "@daytonaio/sdk";
import { Duration, Effect, Schedule } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { SandboxCache } from "../../ports/sandbox";
import { shellQuote } from "../harness/process";
import { call, unavailable } from "./daytona-shell";

export const CACHE_PATH = "/anpord-cache";
export const CACHE_SECONDS = 900;
const VOLUME_CHECK = Duration.seconds(1);
const VOLUME_CHECKS = 60;

type Volume = Awaited<ReturnType<Daytona["volume"]["get"]>>;

export const readyVolume = (daytona: Daytona, name: string) =>
  call(() => daytona.volume.get(name, true)).pipe(
    Effect.repeat(
      Schedule.recurUntil((volume: Volume) => volume.state === "ready").pipe(
        Schedule.intersect(Schedule.spaced(VOLUME_CHECK)),
        Schedule.intersect(Schedule.recurs(VOLUME_CHECKS - 1)),
        Schedule.passthrough
      )
    ),
    Effect.filterOrFail(
      (volume) => volume.state === "ready",
      () => unavailable("the cache volume never became ready")
    )
  );

const ZSTD_WRITE = "zstd -T0 --long=30";
const ZSTD_READ = "zstd -d --long=30";

const entryFor = (key: string) =>
  `${CACHE_PATH}/${encodeURIComponent(key).replaceAll("%", "_")}`;

export type CacheShell = (
  command: string
) => Effect.Effect<
  { readonly exitCode: number; readonly result: string },
  SandboxUnavailable
>;

export const cacheOn = (run: CacheShell): SandboxCache => {
  const manifest = (key: string) =>
    run(`cat ${shellQuote(`${entryFor(key)}/manifest.json`)} 2>/dev/null`).pipe(
      Effect.map(({ exitCode, result }) =>
        exitCode === 0 && result.trim() !== "" ? result.trim() : null
      )
    );

  const digest = (key: string) =>
    run(
      `sha256sum < ${shellQuote(`${entryFor(key)}/archive.tar.zst`)} | cut -d' ' -f1`
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
          `rm -rf ${shellQuote(path)} && mkdir -p ${shellQuote(path)} && tar --use-compress-program=${shellQuote(ZSTD_READ)} -xf ${shellQuote(`${entryFor(key)}/archive.tar.zst`)} -C ${shellQuote(path)}`
        );

        if (exitCode !== 0) {
          yield* run(`rm -rf ${shellQuote(path)}`);
          return false;
        }

        return true;
      }),
    save: (key, path) =>
      Effect.gen(function* () {
        if (yield* manifest(key).pipe(Effect.map((f) => f !== null))) {
          return;
        }

        const entry = entryFor(key);
        const archive = `${entry}/archive.tar.zst`;

        const written = yield* run(
          `mkdir -p ${shellQuote(entry)} && tar --use-compress-program=${shellQuote(ZSTD_WRITE)} -cf ${shellQuote(archive)} -C ${shellQuote(path)} .`
        );

        if (written.exitCode !== 0) {
          yield* run(`rm -f ${shellQuote(archive)}`);
          return;
        }

        const stamp = yield* digest(key);

        if (stamp === null) {
          yield* run(`rm -f ${shellQuote(archive)}`);
          return;
        }

        yield* run(
          `printf '{"digest":"%s"}' ${shellQuote(stamp)} > ${shellQuote(`${entry}/manifest.json`)}`
        );
      }).pipe(Effect.asVoid),
  };
};
