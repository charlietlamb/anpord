import { Effect, Random } from "effect";
import { shellQuote } from "../harness/process";

const EXPORTABLE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface EnvFile {
  readonly contents: string;
  readonly path: string;
}

const nameFor = Random.nextInt.pipe(
  Effect.map((value) => `.anpord-env-${Math.abs(value).toString(36)}`)
);

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
        .map(([name, value]) => `export ${name}=${shellQuote(value)}`)
        .join("\n"),
      path: `${directory}/${yield* nameFor}`,
    };
  });

export const sourcing = (file: EnvFile | null, command: string) =>
  file === null
    ? command
    : `chmod 600 ${shellQuote(file.path)} && . ${shellQuote(file.path)} && rm -f ${shellQuote(file.path)} && ${command}`;
