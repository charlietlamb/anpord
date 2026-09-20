import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = [".env.local", ".env"] as const;

/* What a case is given has to be what it asked for. A name-shaped denylist
   cannot be right about a value it has never seen, and being wrong once hands
   a credential to a model and writes it into the journal. */
const ADDRESS = /^(?:[A-Z0-9_]*_)?(?:URL|URI|HOST|PORT|ENDPOINT|ORIGIN|BASE)$/;

const QUOTED = /^(['"])(.*)\1$/;

/* A connection string carries its password inside it, so the value decides
   too: an http(s) address with no credentials in it, a host, or a port. */
const ADDRESS_VALUE =
  /^(?:https?:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s@]*)?|[A-Za-z0-9.-]+|\d{1,5})$/;

const forwardable = (name: string, value: string) =>
  ADDRESS.test(name) && (value === "" || ADDRESS_VALUE.test(value));

const entryOf = (line: string) => {
  const at = line.indexOf("=");

  if (at <= 0) {
    return [];
  }

  const name = line.slice(0, at).trim();
  const value = line
    .slice(at + 1)
    .trim()
    .replace(QUOTED, "$2");

  return forwardable(name, value) ? [[name, value] as const] : [];
};

const parse = (text: string): Readonly<Record<string, string>> =>
  Object.fromEntries(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
      .flatMap(entryOf)
  );

const read = (directory: string, file: string) => {
  try {
    return parse(readFileSync(join(directory, file), "utf8"));
  } catch {
    return {};
  }
};

/* Lowest precedence first, so `.env.local` beats `.env` and the shell, which
   is what the person typed, beats both. */
export const localEnv = (directory: string): Readonly<Record<string, string>> =>
  Object.assign(
    {},
    ...FILES.map((file) => read(directory, file)).reverse(),
    parse(
      Object.entries(process.env)
        .map(([name, value]) => `${name}=${value ?? ""}`)
        .join("\n")
    )
  );
