import { Duration, Effect, Schedule } from "effect";

type Fetch = (request: Request) => Promise<Response>;

export interface ListenOptions {
  readonly drainTimeout: Duration.DurationInput;
  readonly hostname: string;
  readonly maxRequestBodySize: number;
  readonly port: number;
}

const bind = (fetch: Fetch, options: ListenOptions) =>
  Effect.try({
    try: () =>
      Bun.serve({
        fetch,
        hostname: options.hostname,
        maxRequestBodySize: options.maxRequestBodySize,
        port: options.port,
      }),
    catch: (cause) =>
      new Error(
        `Cannot bind ${options.hostname}:${options.port}. Another process is using it. Run: lsof -ti:${options.port} | xargs kill`,
        { cause }
      ),
  }).pipe(
    Effect.retry(
      Schedule.exponential("120 millis").pipe(
        Schedule.compose(Schedule.recurs(6))
      )
    )
  );

const drain = (
  server: Bun.Server<undefined>,
  timeout: Duration.DurationInput
) =>
  Effect.promise(() => {
    const stopped = server.stop();
    server.closeIdleConnections();
    return stopped;
  }).pipe(
    Effect.interruptible,
    Effect.timeout(timeout),
    Effect.andThen(Effect.logInfo("server drained")),
    Effect.catchTag("TimeoutException", () =>
      Effect.logWarning(
        `requests still running after ${Duration.format(timeout)} end with the process`
      )
    )
  );

export const listen = <E, R>(
  routes: Effect.Effect<Fetch, E, R>,
  options: ListenOptions
) =>
  Effect.gen(function* () {
    const fetch = yield* routes;

    return yield* Effect.acquireRelease(bind(fetch, options), (server) =>
      drain(server, options.drainTimeout)
    );
  });
