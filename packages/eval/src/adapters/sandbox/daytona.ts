import { Daytona, type Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Clock, Duration, Effect, Random, Schedule } from "effect";
import { sandboxUnavailable } from "../../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { execStream } from "./exec-stream";

const logsOf = (logs: unknown, stream: "stdout" | "stderr") => {
  const value = (logs as Record<string, unknown> | null)?.[stream];

  return typeof value === "string" ? value : "";
};

const CACHE_PATH = "/anpord-cache";
const VOLUME_CHECK_MS = 1000;
const VOLUME_CHECKS = 60;

/* A volume is created asynchronously, and mounting one that is still
   pending_create fails the sandbox rather than waiting for it. */
const readyVolume = (daytona: Daytona, name: string) =>
  Effect.iterate(
    { attempts: 0, volume: null as { id: string; state?: string } | null },
    {
      body: ({ attempts }) =>
        Effect.gen(function* () {
          if (attempts > 0) {
            yield* Effect.sleep(Duration.millis(VOLUME_CHECK_MS));
          }

          const volume = yield* Effect.tryPromise({
            catch: unavailable,
            try: () => daytona.volume.get(name, true),
          });

          return { attempts: attempts + 1, volume };
        }),
      while: ({ attempts, volume }) =>
        attempts < VOLUME_CHECKS && volume?.state !== "ready",
    }
  ).pipe(
    Effect.flatMap(({ volume }) =>
      volume === null
        ? Effect.fail(unavailable("the cache volume never became ready"))
        : Effect.succeed(volume)
    )
  );

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

const unavailable = (reason: unknown) => sandboxUnavailable("daytona", reason);

const EXIT_POLL_MS = 250;

const handleFor = (
  sandbox: DaytonaSandbox,
  workspace: string,
  cache: string | null = null
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

  /* The clock alone is not enough: trials run concurrently and two commands
     starting in the same millisecond would name one session, where the second
     createSession either fails or attaches to the first and polls its logs. */
  const sessionName = Effect.gen(function* () {
    const at = yield* Clock.currentTimeMillis;
    const salt = yield* Random.nextIntBetween(0, 1_000_000);

    return `anpord-${at}-${salt}`;
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
          const sessionId = yield* sessionName;
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

    cache,
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
        Effect.gen(function* () {
          const volumes =
            request.cache === undefined
              ? []
              : [
                  {
                    mountPath: CACHE_PATH,
                    volumeId: (yield* readyVolume(daytona, request.cache)).id,
                  },
                ];

          return yield* Effect.tryPromise({
            catch: unavailable,
            try: () =>
              daytona.create({
                autoDeleteInterval:
                  request.autoStopMinutes * AUTO_DELETE_FACTOR,
                autoStopInterval: request.autoStopMinutes,
                volumes,
              }),
          });
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
          Effect.map((sandbox) =>
            handleFor(
              sandbox,
              request.workspace,
              request.cache === undefined ? null : CACHE_PATH
            )
          )
        ),
      provider: "daytona",
    };
  });

export const makeDaytonaAdapter = makeConfiguredDaytonaAdapter();
