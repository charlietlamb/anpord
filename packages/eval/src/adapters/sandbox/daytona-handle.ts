import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Effect } from "effect";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";
import { CACHE_SECONDS, cacheOn } from "./daytona-cache";
import { sessionCommands } from "./daytona-session";
import { cdInto, DEFAULT_TIMEOUT_MS, HOME, unavailable } from "./daytona-shell";

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

  return {
    ...sessionCommands(sandbox, workspace),
    cache: cached ? cacheOn(shellOut) : null,
    id: sandbox.id,
    home: HOME,
    provider: "daytona",
    streaming: true,
    writeFile: (path, content) =>
      execute(
        `mkdir -p "$(dirname ${path})" && cat > ${path} <<'ANPORD_EOF'\n${content}\nANPORD_EOF`
      ).pipe(Effect.asVoid),
  };
};
