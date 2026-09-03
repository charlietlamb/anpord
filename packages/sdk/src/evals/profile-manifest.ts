import { readFile, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { EnvName } from "@anpord/schema/domain/harness-profile";
import { Effect, Option, Schema } from "effect";
import {
  ProfileDirectoryUnreadable,
  ProfileManifestInvalid,
  ProfileManifestOutside,
} from "./profile-errors";

const Manifest = Schema.Struct({
  env: Schema.optional(Schema.Record({ key: EnvName, value: Schema.String })),
  install: Schema.optional(Schema.String),
  run: Schema.optional(Schema.String),
  systemPrompt: Schema.optional(Schema.String),
});

const ManifestJson = Schema.parseJson(Manifest);

type ProfileManifest = typeof Manifest.Type;

const isMissing = (cause: unknown) =>
  cause instanceof Error && "code" in cause && cause.code === "ENOENT";

const readManifestText = (dir: string) =>
  Effect.tryPromise(() => readFile(join(dir, "profile.json"), "utf8")).pipe(
    Effect.map(Option.some),
    Effect.catchIf(
      (failure) => isMissing(failure.cause),
      () => Effect.succeed(Option.none<string>())
    ),
    Effect.mapError(
      (failure) => new ProfileDirectoryUnreadable({ cause: failure.cause, dir })
    )
  );

const decodeManifest = (dir: string, text: string) =>
  Schema.decodeUnknown(ManifestJson)(text).pipe(
    Effect.mapError(
      (issue) => new ProfileManifestInvalid({ dir, reason: issue.message })
    )
  );

/**
 * A manifest value that names a regular file is replaced by that file's
 * content; anything else is kept as written. Env values are always literal.
 *
 * A file outside the profile directory is refused rather than read: the
 * manifest is shipped with the profile, and a prompt that only exists on one
 * machine is not part of it.
 */
const inlined = (dir: string, value: string) =>
  Effect.gen(function* () {
    const target = resolve(dir, value);
    const position = relative(dir, target);
    const inside =
      position !== "" && !(position.startsWith("..") || isAbsolute(position));

    const found = yield* Effect.tryPromise(() => stat(target)).pipe(
      Effect.map((info) => info.isFile()),
      Effect.orElseSucceed(() => false)
    );

    if (!found) {
      return value;
    }

    if (!inside) {
      return yield* new ProfileManifestOutside({ dir, value });
    }

    return yield* Effect.tryPromise({
      catch: (cause) => new ProfileDirectoryUnreadable({ cause, dir }),
      try: () => readFile(target, "utf8"),
    });
  });

const inlinedField = (dir: string, value: string | undefined) =>
  value === undefined ? Effect.succeed(undefined) : inlined(dir, value);

export const readProfileManifest = (dir: string) =>
  Effect.gen(function* () {
    const text = yield* readManifestText(dir);

    if (Option.isNone(text)) {
      return {} satisfies ProfileManifest;
    }

    const manifest = yield* decodeManifest(dir, text.value);

    const [install, run, systemPrompt] = yield* Effect.all([
      inlinedField(dir, manifest.install),
      inlinedField(dir, manifest.run),
      inlinedField(dir, manifest.systemPrompt),
    ]);

    return {
      ...(manifest.env === undefined ? {} : { env: manifest.env }),
      ...(install === undefined ? {} : { install }),
      ...(run === undefined ? {} : { run }),
      ...(systemPrompt === undefined ? {} : { systemPrompt }),
    } satisfies ProfileManifest;
  });
