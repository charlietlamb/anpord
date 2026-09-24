import { Box, EphemeralBox, type ExecStreamChunk } from "@upstash/box";
import { Duration, Effect, Option, Stream } from "effect";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";
import { shellQuote } from "../harness/process";
import { type EnvFile, envFileFor, sourcing } from "./env-file";
import { execStream } from "./exec-stream";
import {
  DEFAULT_TIMEOUT_MS,
  type MakeAdapter,
  providerAdapter,
  providerCall,
  unavailableFor,
} from "./provider-adapter";

const HOME = "/home/boxuser";

const call = providerCall("upstash");
const unavailable = unavailableFor("upstash");

interface UpstashRun extends AsyncIterable<ExecStreamChunk> {
  readonly cancel: () => Promise<unknown>;
  readonly status: string;
}

interface BoxFile {
  readonly content: string;
  readonly path: string;
}

interface UpstashBox {
  readonly delete: Box["delete"];
  readonly exec: { readonly stream: (command: string) => Promise<UpstashRun> };
  readonly files: { readonly write: (file: BoxFile) => Promise<unknown> };
  readonly id: string;
}

const commandFor = (
  workspace: string,
  command: string,
  envFile: EnvFile | null,
  options?: ExecOptions
) => {
  const timeout = Math.max(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1) / 1000;
  return `cd ${shellQuote(options?.cwd ?? workspace)} && timeout --signal=TERM --kill-after=1s ${timeout}s sh -lc ${shellQuote(sourcing(envFile, command))}`;
};

const exitCodeOf = (run: UpstashRun, stdout: (data: string) => void) =>
  Stream.fromAsyncIterable(run, unavailable).pipe(
    Stream.runFoldEffect(1, (exitCode, chunk) =>
      chunk.type === "exit"
        ? Effect.succeed(chunk.exitCode)
        : Effect.sync(() => stdout(chunk.data)).pipe(Effect.as(exitCode))
    )
  );

export const handleFor = (
  box: UpstashBox,
  workspace: string
): SandboxHandle => ({
  cache: Option.none(),
  exec: (command, options) =>
    execStream((sink) =>
      Effect.acquireUseRelease(
        Effect.gen(function* () {
          const envFile = yield* envFileFor(options?.env);

          if (envFile !== null) {
            yield* call(() =>
              box.files.write({ content: envFile.contents, path: envFile.path })
            );
          }

          return yield* call(() =>
            box.exec.stream(commandFor(workspace, command, envFile, options))
          );
        }),
        (run) =>
          exitCodeOf(run, sink.stdout).pipe(
            Effect.timeoutFail({
              duration: Duration.millis(
                (options?.timeoutMs ?? DEFAULT_TIMEOUT_MS) + 5000
              ),
              onTimeout: () => unavailable("the command timed out"),
            })
          ),
        (run) =>
          run.status === "running"
            ? call(() => run.cancel()).pipe(
                Effect.timeout("5 seconds"),
                Effect.ignore
              )
            : Effect.void
      )
    ),
  home: HOME,
  id: box.id,
  provider: "upstash",
  resumable: Option.none(),
  writeFile: (path, content) => call(() => box.files.write({ content, path })),
});

export const upstashAdapter: MakeAdapter = (values) =>
  Effect.succeed(
    providerAdapter<Box | EphemeralBox>({
      connect: (id) => call(() => Box.get(id, { apiKey: values?.apiKey })),
      create: (request) =>
        call(() =>
          EphemeralBox.create({
            apiKey: values?.apiKey,
            runtime: "node",
            ttl: request.autoStopMinutes * 60,
          })
        ),
      destroy: (id) =>
        call(() => Box.delete({ apiKey: values?.apiKey, boxIds: id })),
      discard: (box) => call(() => box.delete()),
      handleFor,
      home: HOME,
      makeWorkspace: (box, workspace) =>
        call(() => box.exec.command(`mkdir -p ${shellQuote(workspace)}`)).pipe(
          Effect.filterOrFail(
            (run) => run.exitCode === 0,
            (run) => unavailable(run.result)
          )
        ),
      provider: "upstash",
    })
  );
