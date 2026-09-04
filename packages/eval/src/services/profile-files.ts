import { posix } from "node:path";
import { Effect } from "effect";
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
const WRITE_CONCURRENCY = 4;

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

/* One mkdir for the whole stage, because E2B, Modal and Upstash write a file
   without creating its parents and a write per directory would cost a round
   trip each. */
const makeParents = (
  sandbox: SandboxHandle,
  files: readonly (readonly [string, string])[]
) => {
  const parents = [...new Set(files.map(([path]) => parentOf(path)))];

  return parents.length === 0
    ? Effect.void
    : runCommand(sandbox, `mkdir -p ${parents.map(shellQuote).join(" ")}`, {
        timeoutMs: MKDIR_TIMEOUT_MS,
      });
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
