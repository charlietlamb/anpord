import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Duration, Effect, Schedule } from "effect";
import type { SandboxHandle } from "../../ports/sandbox";
import {
  call,
  sessionName,
  startSessionCommand,
  unavailable,
} from "./daytona-shell";
import { execStream } from "./exec-stream";
import { DEFAULT_TIMEOUT_MS } from "./provider-adapter";

const EXIT_POLL = Duration.millis(250);

export const sessionExec =
  (sandbox: DaytonaSandbox, workspace: string): SandboxHandle["exec"] =>
  (command, options) =>
    execStream((sink) => {
      const timeout = Duration.millis(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      return Effect.gen(function* () {
        const session = yield* Effect.acquireRelease(
          sessionName.pipe(
            Effect.tap((id) => call(() => sandbox.process.createSession(id)))
          ),
          (id) => Effect.ignore(call(() => sandbox.process.deleteSession(id)))
        );

        const commandId = yield* startSessionCommand(
          sandbox,
          workspace,
          session,
          command,
          options
        );

        yield* call(() =>
          sandbox.process.getSessionCommandLogs(
            session,
            commandId,
            sink.stdout,
            sink.stderr
          )
        );

        return yield* call(() =>
          sandbox.process.getSessionCommand(session, commandId)
        ).pipe(
          Effect.flatMap(({ exitCode }) =>
            exitCode === undefined || exitCode === null
              ? Effect.fail(unavailable("the command is still running"))
              : Effect.succeed(exitCode)
          ),
          Effect.retry(Schedule.spaced(EXIT_POLL).pipe(Schedule.upTo(timeout)))
        );
      }).pipe(
        Effect.scoped,
        Effect.timeoutFail({
          duration: timeout,
          onTimeout: () => unavailable("the command timed out"),
        })
      );
    });
