import { Effect, Random } from "effect";

export const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

/* A name that is not a shell identifier cannot be exported at all, so it is
   dropped rather than quoted: quoting it would produce a command that fails
   at run time instead of a variable nobody can read. */
const EXPORTABLE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * What a command needs in order to read its environment from a file.
 *
 * `contents` is written through the provider's file API, never as an argument
 * of a shell command: the command string is the thing providers retain, and a
 * value spliced into it is a credential in their logs.
 */
export interface EnvFile {
  readonly contents: string;
  readonly path: string;
}

/* Per-exec rather than one fixed path under $HOME: trials share a sandbox, so
   a single file races between concurrent commands and leaves the last run's
   credentials readable after it finished. The command removes it before doing
   anything else, so nothing outlives the exec that needed it. */
const nameFor = Random.nextInt.pipe(
  Effect.map((value) => `.anpord-env-${Math.abs(value).toString(36)}`)
);

/** The directory is the caller's, because a provider may refuse to write
 * outside one tree: Cloudflare's file route resolves every path under
 * `/workspace` and rejects anything else. */
export const envFileFor = (
  env: Readonly<Record<string, string>> | undefined,
  directory = "/tmp"
): Effect.Effect<EnvFile | null> =>
  Effect.gen(function* () {
    const entries = Object.entries(env ?? {}).filter(([name]) =>
      EXPORTABLE.test(name)
    );

    if (entries.length === 0) {
      return null;
    }

    return {
      contents: entries
        .map(([name, value]) => `export ${name}=${quoted(value)}`)
        .join("\n"),
      path: `${directory}/${yield* nameFor}`,
    };
  });

/**
 * Sources the file, removes it, then runs the command.
 *
 * `chmod` before the source rather than after the write, because a provider's
 * file API says nothing about the mode it creates, and the window between a
 * world-readable write and a fix is the exposure being closed.
 */
export const sourcing = (file: EnvFile | null, command: string) =>
  file === null
    ? command
    : `chmod 600 ${quoted(file.path)} && . ${quoted(file.path)} && rm -f ${quoted(file.path)} && ${command}`;
