import { Box, EphemeralBox } from "@upstash/box";
import { Duration, Effect } from "effect";
import { sandboxUnavailable } from "../../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { execStream } from "./exec-stream";
import { notResumable } from "./not-resumable";

const DEFAULT_TIMEOUT_MS = 120_000;
const HOME = "/home/boxuser";

type UpstashBox = Pick<Box, "delete" | "exec" | "files" | "id">;

const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const commandFor = (
  workspace: string,
  command: string,
  options?: ExecOptions
) => {
  const environment = Object.entries(options?.env ?? {}).map(([key, value]) =>
    quoted(`${key}=${value}`)
  );
  const env = environment.length === 0 ? "" : `env ${environment.join(" ")} `;
  const timeout = Math.max(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1) / 1000;
  return `cd ${quoted(options?.cwd ?? workspace)} && ${env}timeout --signal=TERM --kill-after=1s ${timeout}s sh -lc ${quoted(command)}`;
};

const unavailable = (reason: unknown) => sandboxUnavailable("upstash", reason);

const handleFor = (box: UpstashBox, workspace: string): SandboxHandle => ({
  exec: (command, options) =>
    execStream((sink) =>
      Effect.acquireUseRelease(
        Effect.tryPromise({
          catch: unavailable,
          try: () => box.exec.stream(commandFor(workspace, command, options)),
        }),
        (run) =>
          Effect.tryPromise({
            catch: unavailable,
            try: async () => {
              let exitCode = 1;

              for await (const chunk of run) {
                if (chunk.type === "exit") {
                  exitCode = chunk.exitCode;
                } else {
                  sink.stdout(chunk.data);
                }
              }

              return exitCode;
            },
          }).pipe(
            Effect.timeoutFail({
              duration: Duration.millis(
                (options?.timeoutMs ?? DEFAULT_TIMEOUT_MS) + 5000
              ),
              onTimeout: () => unavailable("the command timed out"),
            })
          ),
        (run) =>
          run.status === "running"
            ? Effect.promise(() => run.cancel()).pipe(
                Effect.timeout("5 seconds"),
                Effect.ignore
              )
            : Effect.void
      )
    ),
  home: HOME,
  id: box.id,
  provider: "upstash",
  ...notResumable("upstash"),
  streaming: true,
  writeFile: (path, content) =>
    Effect.tryPromise({
      catch: unavailable,
      try: () => box.files.write({ content, path }),
    }),
});

export const makeConfiguredUpstashAdapter = (
  values?: Readonly<Record<string, string>>
) =>
  Effect.succeed<SandboxAdapterShape>({
    attach: (id) =>
      Effect.tryPromise({
        catch: unavailable,
        try: () => Box.get(id, { apiKey: values?.apiKey }),
      }).pipe(Effect.map((box) => handleFor(box, "/tmp/anpord"))),
    destroy: (handle) =>
      Effect.tryPromise({
        catch: unavailable,
        try: () => Box.delete({ apiKey: values?.apiKey, boxIds: handle.id }),
      }),
    open: (request: OpenSandbox) =>
      Effect.tryPromise({
        catch: unavailable,
        try: () =>
          EphemeralBox.create({
            apiKey: values?.apiKey,
            runtime: "node",
            ttl: request.autoStopMinutes * 60,
          }),
      }).pipe(
        Effect.tap((box) =>
          Effect.tryPromise({
            catch: unavailable,
            try: async () => {
              const run = await box.exec.command(
                `mkdir -p ${quoted(request.workspace)}`
              );

              if (run.exitCode !== 0) {
                throw new Error(run.result);
              }
            },
          })
        ),
        Effect.map((box) => handleFor(box, request.workspace))
      ),
    provider: "upstash",
  });

export const makeUpstashAdapter = makeConfiguredUpstashAdapter();
