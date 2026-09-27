import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isLocalHost } from "../local-hosts";

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);

const DATABASE_URL_LINE = /^DATABASE_URL=(.+)$/m;

const QUOTED = /^(['"])(.*)\1$/;

const fromEnvFile = (file: string) => {
  const path = resolve(REPOSITORY_ROOT, file);
  return existsSync(path)
    ? readFileSync(path, "utf8")
        .match(DATABASE_URL_LINE)?.[1]
        ?.trim()
        .replace(QUOTED, "$2")
    : undefined;
};

export const databaseUrl = () =>
  process.env.DATABASE_URL ?? fromEnvFile(".env.local") ?? fromEnvFile(".env");

export const describeTarget = (url: string) => {
  const parsed = new URL(url);
  return `${decodeURIComponent(parsed.pathname.slice(1))} on ${parsed.host}`;
};

export const isLocal = (url: string) => isLocalHost(new URL(url).hostname);
