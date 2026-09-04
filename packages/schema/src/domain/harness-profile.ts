import { Schema } from "effect";

export const PROFILE_LIMITS = {
  /* Cloudflare and Daytona hand a file's content to the sandbox inside one
     shell argument, which caps a file near 128 KiB once encoded. */
  fileChars: 96_000,
  files: 256,
  totalChars: 2_000_000,
} as const;

export const ProfileName = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9][a-z0-9-]{0,63}$/),
  Schema.annotations({
    description:
      "Lowercase letters, digits and hyphens, at most 64 characters, starting with a letter or digit.",
    identifier: "ProfileName",
  })
);
export type ProfileName = typeof ProfileName.Type;

/* The path rules live in the regex, because a Schema.filter on a Record key
   is lost when the MCP tool schema is generated.

   Every segment is guarded, not just the first and the last: this string is
   joined onto the sandbox home or workspace and written, so one interior
   `..` would put a customer's file anywhere on the machine. */
export const ProfilePath = Schema.String.pipe(
  Schema.pattern(/^(home|workspace)(?:\/(?!\.\.?(?:\/|$))[^/\0]+)+$/),
  Schema.maxLength(512),
  Schema.annotations({
    description:
      "A relative path under home/ or workspace/, without a .. segment.",
    identifier: "ProfilePath",
  })
);
export type ProfilePath = typeof ProfilePath.Type;

export const EnvName = Schema.String.pipe(
  Schema.pattern(/^[A-Z_][A-Z0-9_]*$/),
  Schema.annotations({
    description: "An environment variable name.",
    identifier: "EnvName",
  })
);
export type EnvName = typeof EnvName.Type;

const ProfileFiles = Schema.Record({
  key: ProfilePath,
  value: Schema.String.pipe(Schema.maxLength(PROFILE_LIMITS.fileChars)),
}).pipe(
  Schema.filter((files) => Object.keys(files).length <= PROFILE_LIMITS.files, {
    message: () => `A profile holds at most ${PROFILE_LIMITS.files} files.`,
  }),
  Schema.filter(
    (files) =>
      Object.values(files).reduce((sum, content) => sum + content.length, 0) <=
      PROFILE_LIMITS.totalChars,
    {
      message: () =>
        `A profile's files hold at most ${PROFILE_LIMITS.totalChars} characters in total.`,
    }
  )
);

export const HarnessProfile = Schema.Struct({
  /* Stored in the clear, travels in the definition a customer commits, and
     is readable by anyone who can read the run. A key belongs in an `env`
     credential, which is sealed; this is for the settings that say where to
     look and how to behave. */
  env: Schema.optional(Schema.Record({ key: EnvName, value: Schema.String })),
  files: ProfileFiles,
  install: Schema.optional(Schema.String),
  name: ProfileName,
  run: Schema.optional(Schema.String),
  systemPrompt: Schema.optional(Schema.String),
}).annotations({
  description:
    "Configuration layered on a harness: files written under the sandbox home and workspace, a system prompt, environment, an install command run before the harness, and for the command harness the run command.",
  identifier: "HarnessProfile",
});
export type HarnessProfile = typeof HarnessProfile.Type;

/** The one rule the wire schema cannot express in JSON Schema, so every tool
 * description repeats it. */
export const profileFitsHarness = (task: {
  readonly harness: string;
  readonly profile?: HarnessProfile | undefined;
}): boolean =>
  task.harness === "command"
    ? task.profile?.run !== undefined
    : task.profile?.run === undefined;

export const PROFILE_HARNESS_RULE =
  "The command harness needs a profile with a run command; other harnesses take no run. Any harness may take an install command.";
