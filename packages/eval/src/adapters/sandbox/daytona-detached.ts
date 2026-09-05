import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Effect } from "effect";
import type { ResumableCommands } from "../../ports/sandbox";
import { cdInto, sessionName, unavailable } from "./daytona-shell";

const logsOf = (logs: unknown, stream: "stdout" | "stderr") => {
  const value = (logs as Record<string, unknown> | null)?.[stream];

  return typeof value === "string" ? value : "";
};

/**
 * Commands that outlive the call which started them.
 *
 * Daytona is the only provider offering this: its sessions survive the request
 * that created them, so a half-hour install can be started, left, and polled.
 */
export const detachedCommands = (
  sandbox: DaytonaSandbox,
  workspace: string
): ResumableCommands => ({
  progress: (started) =>
    Effect.all({
      command: Effect.tryPromise({
        catch: unavailable,
        try: () =>
          sandbox.process.getSessionCommand(started.session, started.id),
      }),
      logs: Effect.tryPromise({
        catch: unavailable,
        try: () =>
          sandbox.process.getSessionCommandLogs(started.session, started.id),
      }),
    }).pipe(
      Effect.map(({ command, logs }) => ({
        exitCode: command.exitCode ?? null,
        stderr: logsOf(logs, "stderr"),
        stdout: logsOf(logs, "stdout"),
      }))
    ),

  /* The session is deliberately not released with the calling scope, unlike
     exec's: the point of starting detached is that the command outlives the
     process that asked for it, and a released session takes the command with
     it. Deleting the sandbox takes its sessions, which bounds them. */
  start: (command, options) =>
    Effect.gen(function* () {
      const id = yield* sessionName;

      yield* Effect.tryPromise({
        catch: unavailable,
        try: () => sandbox.process.createSession(id),
      });

      const started = yield* Effect.tryPromise({
        catch: unavailable,
        try: () =>
          sandbox.process.executeSessionCommand(id, {
            command: cdInto(options?.cwd ?? workspace, command, options?.env),
            runAsync: true,
          }),
      });

      return { id: started.cmdId ?? "", session: id };
    }),
});
