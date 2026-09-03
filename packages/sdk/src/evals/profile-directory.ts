import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type { EvalHarness } from "@anpord/schema/domain/evals";
import {
  type HarnessProfile,
  PROFILE_LIMITS,
  ProfilePath,
  profileFitsHarness,
} from "@anpord/schema/domain/harness-profile";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { Effect, Schema } from "effect";
import {
  CommandProfileNeedsRun,
  ProfileDirectoryUnreadable,
  ProfileFileTooLarge,
  ProfilePathInvalid,
  ProfileStepNotSupported,
  ProfileTooLarge,
  ProfileTooManyFiles,
} from "./profile-errors";
import { readProfileManifest } from "./profile-manifest";
import type { ProfileRef } from "./types";

type PublicEvalTask = PublicStartEvalRequest["tasks"][number];

const SHIPPED_ROOTS = ["home", "workspace"] as const;
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git"]);

const isMissing = (cause: unknown) =>
  cause instanceof Error && "code" in cause && cause.code === "ENOENT";

/** Every regular file below `current`, as a posix path relative to `dir`. */
const walk = async (dir: string, current: string): Promise<string[]> => {
  const entries = await readdir(current, { withFileTypes: true });
  const found = await Promise.all(
    entries.map((entry) => {
      const path = join(current, entry.name);

      if (entry.isDirectory()) {
        return SKIPPED_DIRECTORIES.has(entry.name) ? [] : walk(dir, path);
      }

      return entry.isFile()
        ? [
            path
              .slice(dir.length + 1)
              .split(sep)
              .join("/"),
          ]
        : [];
    })
  );

  return found.flat();
};

/* A root that is absent ships nothing; a profile with only workspace files
   is complete. */
const walkRoot = (dir: string, root: string) =>
  walk(dir, join(dir, root)).catch((cause: unknown) => {
    if (isMissing(cause)) {
      return [];
    }

    throw cause;
  });

const shippedPaths = (dir: string) =>
  Effect.tryPromise({
    catch: (cause) => new ProfileDirectoryUnreadable({ cause, dir }),
    try: async () => {
      const roots = await Promise.all(
        SHIPPED_ROOTS.map((root) => walkRoot(dir, root))
      );

      return roots.flat().sort();
    },
  });

const validPath = (path: string) =>
  Schema.decodeUnknown(ProfilePath)(path).pipe(
    Effect.mapError(() => new ProfilePathInvalid({ path }))
  );

/** The file's text, or nothing when it holds a NUL byte and is not text. */
const readShipped = (dir: string, path: string) =>
  Effect.gen(function* () {
    const bytes = yield* Effect.tryPromise({
      catch: (cause) => new ProfileDirectoryUnreadable({ cause, dir }),
      try: () => readFile(join(dir, path)),
    });

    if (bytes.includes(0)) {
      return [];
    }

    const content = bytes.toString("utf8");

    if (content.length > PROFILE_LIMITS.fileChars) {
      return yield* new ProfileFileTooLarge({ chars: content.length, path });
    }

    return [[yield* validPath(path), content] as const];
  });

const shippedFiles = (dir: string) =>
  Effect.gen(function* () {
    const paths = yield* shippedPaths(dir);

    if (paths.length > PROFILE_LIMITS.files) {
      return yield* new ProfileTooManyFiles({ count: paths.length });
    }

    const entries = yield* Effect.forEach(
      paths,
      (path) => readShipped(dir, path),
      { concurrency: 8 }
    ).pipe(Effect.map((read) => read.flat()));

    const chars = entries.reduce((sum, [, content]) => sum + content.length, 0);

    if (chars > PROFILE_LIMITS.totalChars) {
      return yield* new ProfileTooLarge({ chars });
    }

    return Object.fromEntries(entries);
  });

const fittingHarness = (base: EvalHarness, profile: HarnessProfile) => {
  if (profileFitsHarness({ harness: base, profile })) {
    return Effect.succeed(profile);
  }

  if (base === "command") {
    return new CommandProfileNeedsRun({ name: profile.name });
  }

  return new ProfileStepNotSupported({
    base,
    step: profile.install === undefined ? "run" : "install",
  });
};

/** The task a definition's `{ base, profile }` harness compiles to, with the
 * profile directory read relative to the eval file. */
export const profileTask = (
  entry: string,
  task: {
    readonly harness: {
      readonly base: EvalHarness;
      readonly profile: ProfileRef;
    };
    readonly model: string;
    readonly provider: PublicEvalTask["provider"];
  }
) =>
  Effect.gen(function* () {
    const dir = resolve(dirname(entry), task.harness.profile.dir);

    yield* Effect.tryPromise({
      catch: (cause) => new ProfileDirectoryUnreadable({ cause, dir }),
      try: () => readdir(dir),
    });

    const [files, manifest] = yield* Effect.all([
      shippedFiles(dir),
      readProfileManifest(dir),
    ]);

    const profile = yield* fittingHarness(task.harness.base, {
      ...manifest,
      files,
      name: task.harness.profile.name,
    });

    return {
      harness: task.harness.base,
      model: task.model,
      profile,
      provider: task.provider,
    } satisfies PublicEvalTask;
  }).pipe(
    Effect.withSpan("Eval.profileTask", {
      attributes: { profile: task.harness.profile.name },
    })
  );
