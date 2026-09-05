import { dirname } from "node:path";
import { Effect } from "effect";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";
import { noCache, noResumableCommands } from "./capabilities";
import {
  type BridgeConfiguration,
  ensure,
  unavailable,
} from "./cloudflare-bridge";
import { type ExecSink, readEvents } from "./cloudflare-events";
import { type EnvFile, envFileFor, quoted, sourcing } from "./env-file";
import { execStream } from "./exec-stream";

const DEFAULT_TIMEOUT_MS = 120_000;
const HOME = "/home/sandbox";
/* The bridge resolves every file path under this tree and refuses the rest,
   so the env file cannot live in /tmp the way it does elsewhere. */
const WRITABLE_ROOT = "/workspace";

const commandFor = (
  workspace: string,
  command: string,
  envFile: EnvFile | null,
  options?: ExecOptions
) =>
  `cd ${quoted(options?.cwd ?? workspace)} && bash -lc ${quoted(sourcing(envFile, command))}`;

export const handleFor = (
  id: string,
  workspace: string,
  configured: Promise<BridgeConfiguration>
): SandboxHandle => {
  /* The body carries the bytes, so the values never enter a command string
     the bridge traces or the container's shell history keeps. */
  const upload = async (path: string, contents: string) => {
    const { key, url } = await configured;
    await ensure(
      await fetch(`${url}/v1/sandbox/${id}/file${path}`, {
        body: contents,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/octet-stream",
        },
        method: "PUT",
      })
    );
  };

  const execute = async (
    command: string,
    sink: ExecSink,
    options?: ExecOptions,
    envFile: EnvFile | null = null
  ) => {
    const { key, url } = await configured;
    const response = await ensure(
      await fetch(`${url}/v1/sandbox/${id}/exec`, {
        body: JSON.stringify({
          argv: [
            "bash",
            "-lc",
            commandFor(workspace, command, envFile, options),
          ],
          timeout_ms: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        }),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    );
    return readEvents(response, sink);
  };

  return {
    cache: noCache,
    exec: (command, options) =>
      execStream((sink) =>
        Effect.gen(function* () {
          const envFile = yield* envFileFor(options?.env, WRITABLE_ROOT);

          if (envFile !== null) {
            yield* Effect.tryPromise({
              catch: unavailable,
              try: () => upload(envFile.path, envFile.contents),
            });
          }

          return yield* Effect.tryPromise({
            catch: unavailable,
            try: () => execute(command, sink, options, envFile),
          });
        })
      ),
    home: HOME,
    id,
    provider: "cloudflare",
    resumable: noResumableCommands,
    writeFile: (path, content) =>
      Effect.tryPromise({
        catch: unavailable,
        try: async () => {
          const encoded = Buffer.from(content).toString("base64");
          const exitCode = await execute(
            `mkdir -p ${quoted(dirname(path))} && printf %s ${quoted(encoded)} | base64 -d > ${quoted(path)}`,
            { stderr: () => undefined, stdout: () => undefined }
          );
          if (exitCode !== 0) {
            throw new Error(`Cloudflare file write exited ${exitCode}`);
          }
        },
      }),
  };
};
