import { Effect, Stream } from "effect";
import { SandboxUnavailable } from "../../domain/errors";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";

export const runCommand = (
  sandbox: SandboxHandle,
  command: string,
  options?: ExecOptions
) =>
  sandbox.exec(command, options).pipe(
    Stream.runFold(1, (code, chunk) =>
      chunk.stream === "exit" ? chunk.exitCode : code
    ),
    Effect.flatMap((exitCode) =>
      exitCode === 0
        ? Effect.void
        : Effect.fail(
            new SandboxUnavailable({
              provider: sandbox.provider,
              reason: `Command exited with status ${exitCode}`,
            })
          )
    )
  );
