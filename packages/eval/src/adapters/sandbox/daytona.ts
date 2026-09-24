import {
  Daytona,
  DaytonaNotFoundError,
  type Sandbox as DaytonaSandbox,
} from "@daytonaio/sdk";
import { Effect, Option } from "effect";
import type { SandboxHandle } from "../../ports/sandbox";
import { shellQuote } from "../harness/process";
import {
  CACHE_PATH,
  CACHE_SECONDS,
  cacheOn,
  readyVolume,
} from "./daytona-cache";
import { detachedCommands } from "./daytona-detached";
import { sessionExec } from "./daytona-session";
import { call, HOME, unavailable } from "./daytona-shell";
import { type MakeAdapter, providerAdapter } from "./provider-adapter";

const SNAPSHOT = "anpord-eval:4";
const AUTO_DELETE_FACTOR = 6;
const MKDIR_SECONDS = 30;

const handleFor = (
  sandbox: DaytonaSandbox,
  workspace: string,
  cached: boolean
): SandboxHandle => {
  const shellOut = (command: string) =>
    call(() =>
      sandbox.process.executeCommand(command, HOME, undefined, CACHE_SECONDS)
    ).pipe(
      Effect.map((reply) => ({
        exitCode: reply.exitCode ?? 1,
        result: String(reply.result ?? ""),
      }))
    );

  return {
    cache: cached ? Option.some(cacheOn(shellOut)) : Option.none(),
    exec: sessionExec(sandbox, workspace),
    home: HOME,
    id: sandbox.id,
    provider: "daytona",
    resumable: Option.some(detachedCommands(sandbox, workspace)),
    writeFile: (path, content) =>
      call(() =>
        sandbox.process.executeCommand(
          `mkdir -p "$(dirname ${shellQuote(path)})"`,
          HOME,
          undefined,
          MKDIR_SECONDS
        )
      ).pipe(
        Effect.zipRight(
          call(() => sandbox.fs.uploadFile(Buffer.from(content), path))
        )
      ),
  };
};

export const daytonaAdapter: MakeAdapter = (values) =>
  Effect.sync(() => {
    const daytona = new Daytona(
      values?.apiKey ? { apiKey: values.apiKey } : undefined
    );

    return providerAdapter({
      connect: (id) => call(() => daytona.get(id)),
      create: (request) =>
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

          return yield* call(() =>
            daytona.create({
              autoDeleteInterval: request.autoStopMinutes * AUTO_DELETE_FACTOR,
              autoStopInterval: request.autoStopMinutes,
              snapshot: SNAPSHOT,
              volumes,
            })
          );
        }),
      destroy: (id) =>
        Effect.tryPromise(async () => {
          const sandbox = await daytona.get(id);
          await sandbox.delete();
        }).pipe(
          Effect.catchIf(
            ({ error }) => error instanceof DaytonaNotFoundError,
            () => Effect.void
          ),
          Effect.mapError(({ error }) => unavailable(error))
        ),
      discard: (sandbox) => call(() => sandbox.delete()),
      handleFor: (sandbox, workspace, request) =>
        handleFor(sandbox, workspace, request?.cache !== undefined),
      home: HOME,
      makeWorkspace: (sandbox, workspace) =>
        call(() =>
          sandbox.process.executeCommand(
            `mkdir -p ${shellQuote(workspace)}`,
            HOME,
            undefined,
            MKDIR_SECONDS
          )
        ),
      provider: "daytona",
    });
  });
