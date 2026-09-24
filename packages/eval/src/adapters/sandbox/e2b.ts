import { Sandbox as E2BSandbox } from "e2b";
import { Effect, Option, Schema } from "effect";
import type { SandboxHandle } from "../../ports/sandbox";
import { shellQuote } from "../harness/process";
import { execStream } from "./exec-stream";
import {
  DEFAULT_TIMEOUT_MS,
  type MakeAdapter,
  providerAdapter,
  providerCall,
  unavailableFor,
} from "./provider-adapter";

const HOME = "/home/user";

const call = providerCall("e2b");

const Exited = Schema.Struct({ exitCode: Schema.Number });

const decodeRejection = Schema.decodeUnknownOption(
  Schema.Union(Schema.Struct({ result: Exited }), Exited)
);

const exitCodeOf = (rejection: unknown) =>
  decodeRejection(rejection).pipe(
    Option.map((found) =>
      "result" in found ? found.result.exitCode : found.exitCode
    )
  );

const handleFor = (sandbox: E2BSandbox, workspace: string): SandboxHandle => ({
  cache: Option.none(),
  exec: (command, options) =>
    execStream((sink) =>
      Effect.tryPromise(() =>
        sandbox.commands.run(command, {
          cwd: options?.cwd ?? workspace,
          envs: options?.env && { ...options.env },
          onStderr: sink.stderr,
          onStdout: sink.stdout,
          timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        })
      ).pipe(
        Effect.map((result) => result.exitCode),
        Effect.catchAll(({ error }) =>
          Option.match(exitCodeOf(error), {
            onNone: () =>
              Effect.fail(unavailableFor("e2b", `exec ${command}`)(error)),
            onSome: Effect.succeed,
          })
        )
      )
    ),
  home: HOME,
  id: sandbox.sandboxId,
  provider: "e2b",
  resumable: Option.none(),
  writeFile: (path, content) =>
    call(() => sandbox.files.write(path, content), `write ${path}`).pipe(
      Effect.asVoid
    ),
});

export const e2bAdapter: MakeAdapter = (values) =>
  Effect.sync(() =>
    providerAdapter({
      connect: (id) =>
        call(
          () => E2BSandbox.connect(id, { apiKey: values?.apiKey }),
          "attach"
        ),
      create: (request) =>
        call(
          () =>
            E2BSandbox.create({
              apiKey: values?.apiKey,
              timeoutMs: request.autoStopMinutes * 60_000,
            }),
          "create"
        ),
      destroy: (id) =>
        call(() => E2BSandbox.kill(id, { apiKey: values?.apiKey }), "destroy"),
      discard: (sandbox) => call(() => sandbox.kill()),
      handleFor,
      home: HOME,
      makeWorkspace: (sandbox, workspace) =>
        call(
          () => sandbox.commands.run(`mkdir -p ${shellQuote(workspace)}`),
          "create workspace"
        ),
      provider: "e2b",
    })
  );
