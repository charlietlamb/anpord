import { sandboxUnavailable } from "../../domain/errors";

export const HOME = "/home/daytona";
export const DEFAULT_TIMEOUT_MS = 120_000;

export const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const exporting = (env: Readonly<Record<string, string>> | undefined) =>
  env === undefined || Object.keys(env).length === 0
    ? ""
    : `${Object.entries(env)
        .map(([name, value]) => `export ${name}=${quoted(value)};`)
        .join(" ")} `;

export const cdInto = (
  workspace: string,
  command: string,
  env?: Readonly<Record<string, string>>
) => `${exporting(env)}cd ${workspace} && ${command}`;

export const unavailable = (reason: unknown) =>
  sandboxUnavailable("daytona", reason);
