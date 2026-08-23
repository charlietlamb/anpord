import { Daytona, type Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Clock, Duration, Effect, Schedule } from "effect";
import { SandboxUnavailable } from "../../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { execStream } from "./exec-stream";

const HOME = "/home/daytona";
const DEFAULT_TIMEOUT_MS = 120_000;
const AUTO_DELETE_FACTOR = 6;

const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const exporting = (env: Readonly<Record<string, string>> | undefined) =>
  env === undefined || Object.keys(env).length === 0
    ? ""
    : `${Object.entries(env)
        .map(([name, value]) => `export ${name}=${quoted(value)};`)
        .join(" ")} `;

const cdInto = (
  workspace: string,
  command: string,
  env?: Readonly<Record<string, string>>
) => `${exporting(env)}cd ${workspace} && ${command}`;

const unavailable = (reason: unknown) =>
  new SandboxUnavailable({
    provider: "daytona",
    reason: reason instanceof Error ? reason.message : String(reason),
  });

const EXIT_POLL_MS = 250;

const handleFor = (
  sandbox: DaytonaSandbox,
  workspace: string
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

  const session = (id: string) =>
    Effect.acquireRelease(
      Effect.tryPromise({
        catch: unavailable,
        try: () => sandbox.process.createSession(id),
      }).pipe(Effect.as(id)),
      () =>
        Effect.promise(() => sandbox.process.deleteSession(id)).pipe(
          Effect.ignore
        )
    );

  const exitCodeOf = (
    sessionId: string,
    commandId: string,
    deadlineMs: number
  ) =>
    Effect.tryPromise({
      catch: unavailable,
      try: () => sandbox.process.getSessionCommand(sessionId, commandId),
    }).pipe(
      Effect.map((command) => command.exitCode),
      Effect.flatMap((code) =>
        code === undefined || code === null
          ? Effect.fail(unavailable("the command is still running"))
          : Effect.succeed(code)
      ),
      Effect.retry(
        Schedule.spaced(Duration.millis(EXIT_POLL_MS)).pipe(
          Schedule.upTo(Duration.millis(deadlineMs))
        )
      )
    );

  return {
    exec: (command, options) =>
      execStream((sink) => {
        const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

        return Effect.gen(function* () {
          const sessionId = `anpord-${yield* Clock.currentTimeMillis}`;
          yield* session(sessionId);

          const started = yield* Effect.tryPromise({
            catch: unavailable,
            try: () =>
              sandbox.process.executeSessionCommand(sessionId, {
                command: cdInto(
                  options?.cwd ?? workspace,
                  command,
                  options?.env
                ),
                runAsync: true,
              }),
          });

          const commandId = started.cmdId ?? "";

          yield* Effect.tryPromise({
            catch: unavailable,
            try: () =>
              sandbox.process.getSessionCommandLogs(
                sessionId,
                commandId,
                sink.stdout,
                sink.stderr
              ),
          });

          return yield* exitCodeOf(sessionId, commandId, timeoutMs);
        }).pipe(
          Effect.scoped,
          Effect.timeoutFail({
            duration: Duration.millis(timeoutMs),
            onTimeout: () => unavailable("the command timed out"),
          })
        );
      }),
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

export const makeConfiguredDaytonaAdapter = (
  values?: Readonly<Record<string, string>>
) =>
  Effect.sync((): SandboxAdapterShape => {
    const daytona = new Daytona(
      values?.apiKey ? { apiKey: values.apiKey } : undefined
    );

    return {
      attach: (id) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () => daytona.get(id),
        }).pipe(Effect.map((sandbox) => handleFor(sandbox, "/tmp/anpord"))),
      destroy: (handle) =>
        Effect.tryPromise({
          catch: unavailable,
          try: async () => {
            const sandbox = await daytona.get(handle.id);
            await sandbox.delete();
          },
        }),
      open: (request: OpenSandbox) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () =>
            daytona.create({
              autoDeleteInterval: request.autoStopMinutes * AUTO_DELETE_FACTOR,
              autoStopInterval: request.autoStopMinutes,
            }),
        }).pipe(
          Effect.tap((sandbox) =>
            Effect.tryPromise({
              catch: unavailable,
              try: () =>
                sandbox.process.executeCommand(
                  `mkdir -p ${request.workspace}`,
                  HOME,
                  undefined,
                  30
                ),
            })
          ),
          Effect.map((sandbox) => handleFor(sandbox, request.workspace))
        ),
      provider: "daytona",
    };
  });

export const makeDaytonaAdapter = makeConfiguredDaytonaAdapter();
