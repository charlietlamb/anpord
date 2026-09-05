import { Box, EphemeralBox, type ExecStreamChunk } from "@upstash/box";
import { Duration, Effect } from "effect";
import { sandboxUnavailable } from "../../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { settingUp } from "./after-create";
import { noCache, noResumableCommands } from "./capabilities";
import { type EnvFile, envFileFor, quoted, sourcing } from "./env-file";
import { execStream } from "./exec-stream";

const DEFAULT_TIMEOUT_MS = 120_000;
const HOME = "/home/boxuser";

/** Only what a handle reaches for, so a fake standing in for a box in a test
 * is a real value of this type rather than an assertion about one. */
interface UpstashRun extends AsyncIterable<ExecStreamChunk> {
  readonly cancel: () => Promise<unknown>;
  readonly status: string;
}

interface UpstashBox {
  readonly delete: Box["delete"];
  readonly exec: { readonly stream: (command: string) => Promise<UpstashRun> };
  readonly files: { readonly write: (file: BoxFile) => Promise<unknown> };
  readonly id: string;
}

interface BoxFile {
  readonly content: string;
  readonly path: string;
}

const commandFor = (
  workspace: string,
  command: string,
  envFile: EnvFile | null,
  options?: ExecOptions
) => {
  const timeout = Math.max(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1) / 1000;
  return `cd ${quoted(options?.cwd ?? workspace)} && timeout --signal=TERM --kill-after=1s ${timeout}s sh -lc ${quoted(sourcing(envFile, command))}`;
};

const unavailable = (reason: unknown) => sandboxUnavailable("upstash", reason);

export const handleFor = (
  box: UpstashBox,
  workspace: string
): SandboxHandle => ({
  cache: noCache,
  exec: (command, options) =>
    execStream((sink) =>
      Effect.acquireUseRelease(
        Effect.gen(function* () {
          const envFile = yield* envFileFor(options?.env);

          /* Written through the file API rather than spliced into the
             command: the command string is what the provider records. */
          if (envFile !== null) {
            yield* Effect.tryPromise({
              catch: unavailable,
              try: () =>
                box.files.write({
                  content: envFile.contents,
                  path: envFile.path,
                }),
            });
          }

          return yield* Effect.tryPromise({
            catch: unavailable,
            try: () =>
              box.exec.stream(commandFor(workspace, command, envFile, options)),
          });
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
  resumable: noResumableCommands,
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
        Effect.flatMap((box) =>
          settingUp(
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
            }),
            handleFor(box, request.workspace),
            () => box.delete()
          )
        )
      ),
    provider: "upstash",
  });

export const makeUpstashAdapter = makeConfiguredUpstashAdapter();
