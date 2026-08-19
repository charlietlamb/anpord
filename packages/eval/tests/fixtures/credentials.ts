import { readFileSync } from "node:fs";
import { homedir } from "node:os";

/**
 * Where the integration tests find their keys.
 *
 * `EVAL_KEY_DIR` rather than a path baked into each test: a directory that
 * exists on one machine, in one session, is not a fixture, and four copies of
 * it is four things to change. The vendor SDKs read their own environment
 * variables, so setting them here is what makes the adapters work at all.
 */
const keyDir = process.env.EVAL_KEY_DIR;

const readKey = (name: string) => {
  if (keyDir === undefined) {
    return;
  }

  try {
    return readFileSync(`${keyDir}/${name}`, "utf8").trim();
  } catch {
    return;
  }
};

process.env.E2B_API_KEY ??= readKey("e2b.key");
process.env.DAYTONA_API_KEY ??= readKey("daytona.key");

/** Codex authenticates over OAuth, so what a sandbox needs is the auth file
 * the CLI writes for itself rather than an API key. */
export const codexCredentials = (() => {
  try {
    return readFileSync(`${homedir()}/.codex/auth.json`, "utf8").trim();
  } catch {
    return;
  }
})();

export const hasDaytona = Boolean(process.env.DAYTONA_API_KEY);
export const hasE2B = Boolean(process.env.E2B_API_KEY);
export const hasCodex = Boolean(codexCredentials);
export const hasDatabase = Boolean(process.env.EVAL_TEST_DATABASE_URL);
