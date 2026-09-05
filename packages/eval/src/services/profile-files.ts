import { posix } from "node:path";
import { Array as Arr, Effect } from "effect";
import { shellQuote } from "../adapters/harness/process";
import { runCommand } from "../adapters/sandbox/run-command";
import type { SandboxUnavailable } from "../domain/errors";
import type { ProfileContent } from "../domain/harness-profile";
import type { SandboxHandle } from "../ports/sandbox";

export interface MaterialiseProfile {
  readonly home: string;
  readonly profile: ProfileContent;
  readonly sandbox: SandboxHandle;
  readonly stage: "home" | "workspace";
  readonly workspace: string;
}

const MKDIR_TIMEOUT_MS = 60_000;
/* Shared with the fixture writer, so one number governs how hard a trial
   leans on a sandbox's file API. */
export const WRITE_CONCURRENCY = 4;

/** Where the system prompt lands, so a driver can name it on a command line. */
export const systemPromptPath = (home: string) =>
  `${home}/.anpord/system-prompt.md`;

const parentOf = (path: string) => path.slice(0, path.lastIndexOf("/"));

/* The wire schema already refuses a `.` or `..` segment. Checked again here
   because this is the last place before a write: a path that reached the
   sandbox from anywhere but a decoded request would otherwise land wherever
   it asked to. */
const within = (root: string, path: string) => {
  const resolved = posix.normalize(`${root}/${path}`);

  return resolved === root || resolved.startsWith(`${root}/`);
};

const staged = (input: MaterialiseProfile) => {
  const prefix = `${input.stage}/`;
  const root = input.stage === "home" ? input.home : input.workspace;

  const files = Object.entries(input.profile.files)
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, content]) => [path.slice(prefix.length), content] as const)
    .filter(([path]) => within(root, path))
    .map(([path, content]) => [`${root}/${path}`, content] as const);

  const prompt = input.profile.systemPrompt;

  return input.stage === "home" && prompt !== null
    ? [...files, [systemPromptPath(input.home), prompt] as const]
    : files;
};

/* Linux caps one argv element at 128 KiB, and the whole `mkdir -p` is handed
   to `sh -c` as one. A profile may name 256 paths, each of which a deep tree
   makes long, so the joined command can pass that ceiling and die as an opaque
   E2BIG. Chunked well under it: a directory is at most 4096 bytes, so 24 of
   them plus their quoting cannot reach the limit whatever they are called. */
const PARENTS_PER_COMMAND = 24;

/* Batched rather than one command per directory, because E2B, Modal and
   Upstash write a file without creating its parents and a round trip each
   would cost a profile its startup. */
const makeParents = (
  sandbox: SandboxHandle,
  files: readonly (readonly [string, string])[]
) => {
  const parents = [...new Set(files.map(([path]) => parentOf(path)))];

  return Effect.forEach(
    Arr.chunksOf(parents, PARENTS_PER_COMMAND),
    (batch) =>
      runCommand(sandbox, `mkdir -p ${batch.map(shellQuote).join(" ")}`, {
        timeoutMs: MKDIR_TIMEOUT_MS,
      }),
    { discard: true }
  );
};

export const materialiseProfile = (
  input: MaterialiseProfile
): Effect.Effect<void, SandboxUnavailable> =>
  Effect.gen(function* () {
    const files = staged(input);

    if (files.length === 0) {
      return;
    }

    yield* makeParents(input.sandbox, files);

    yield* Effect.forEach(
      files,
      ([path, content]) => input.sandbox.writeFile(path, content),
      { concurrency: WRITE_CONCURRENCY, discard: true }
    );
  }).pipe(
    Effect.withSpan("ProfileFiles.materialise", {
      attributes: { stage: input.stage },
    })
  );
