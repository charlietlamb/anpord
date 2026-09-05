import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Effect, Option } from "effect";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";
import { noCache } from "./capabilities";
import { CACHE_SECONDS, cacheOn } from "./daytona-cache";
import { sessionCommands } from "./daytona-session";
import { cdInto, DEFAULT_TIMEOUT_MS, HOME, unavailable } from "./daytona-shell";
import { quoted } from "./env-file";

export const handleFor = (
  sandbox: DaytonaSandbox,
  workspace: string,
  cached = false
): SandboxHandle => {
  const execute = (command: string, options?: ExecOptions) =>
    Effect.tryPromise({
      catch: unavailable,
      try: () =>
        sandbox.process.executeCommand(
          cdInto(options?.cwd ?? workspace, command),
          HOME,
          options?.env,
          Math.ceil((options?.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000)
        ),
    });

  /* Run from home rather than the workspace, and long enough for an archive
     of a dependency tree: the cache works on paths of its own. */
  const shellOut = (command: string) =>
    Effect.tryPromise({
      catch: unavailable,
      try: () =>
        sandbox.process.executeCommand(command, HOME, undefined, CACHE_SECONDS),
    }).pipe(
      Effect.map((reply) => ({
        exitCode: reply.exitCode ?? 1,
        result: String(reply.result ?? ""),
      }))
    );

  const { exec, resumable } = sessionCommands(sandbox, workspace);

  return {
    cache: cached ? Option.some(cacheOn(shellOut)) : noCache,
    exec,
    id: sandbox.id,
    home: HOME,
    provider: "daytona",
    resumable: Option.some(resumable),
    /* Uploaded rather than shelled through a heredoc, which wrote a file a
       byte longer than it was given (the newline before the closing marker)
       and truncated any content that happened to look like the marker. */
    writeFile: (path, content) =>
      execute(`mkdir -p "$(dirname ${quoted(path)})"`).pipe(
        Effect.flatMap(() =>
          Effect.tryPromise({
            catch: unavailable,
            try: () => sandbox.fs.uploadFile(Buffer.from(content), path),
          })
        )
      ),
  };
};
