import { dirname } from "node:path";
import {
  type HttpClient,
  HttpClientRequest as Request,
} from "@effect/platform";
import { Effect, Option } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";
import { shellQuote } from "../harness/process";
import {
  type BridgeConfiguration,
  send,
  unavailable,
} from "./cloudflare-bridge";
import { readEvents } from "./cloudflare-events";
import { type EnvFile, envFileFor, sourcing } from "./env-file";
import { type ExecSink, execStream } from "./exec-stream";
import { DEFAULT_TIMEOUT_MS } from "./provider-adapter";

const HOME = "/home/sandbox";
export const WRITABLE_ROOT = "/workspace";

const SILENT: ExecSink = { stderr: () => undefined, stdout: () => undefined };

export interface Bridge {
  readonly client: HttpClient.HttpClient;
  readonly configured: Effect.Effect<BridgeConfiguration, SandboxUnavailable>;
}

export const bridgeRequest = (
  bridge: Bridge,
  request: (url: string) => Request.HttpClientRequest
) =>
  bridge.configured.pipe(
    Effect.flatMap(({ key, url }) =>
      send(bridge.client, request(url).pipe(Request.bearerToken(key)))
    )
  );

const commandFor = (
  workspace: string,
  command: string,
  envFile: EnvFile | null,
  options?: ExecOptions
) =>
  `cd ${shellQuote(options?.cwd ?? workspace)} && bash -lc ${shellQuote(sourcing(envFile, command))}`;

export const handleFor = (
  id: string,
  workspace: string,
  bridge: Bridge
): SandboxHandle => {
  const execute = (
    command: string,
    sink: ExecSink,
    options?: ExecOptions,
    envFile: EnvFile | null = null
  ) =>
    bridgeRequest(bridge, (url) =>
      Request.post(`${url}/v1/sandbox/${id}/exec`).pipe(
        Request.bodyUnsafeJson({
          argv: [
            "bash",
            "-lc",
            commandFor(workspace, command, envFile, options),
          ],
          timeout_ms: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        })
      )
    ).pipe(Effect.flatMap((response) => readEvents(response, sink)));

  return {
    cache: Option.none(),
    exec: (command, options) =>
      execStream((sink) =>
        Effect.gen(function* () {
          const envFile = yield* envFileFor(options?.env, WRITABLE_ROOT);

          if (envFile !== null) {
            yield* bridgeRequest(bridge, (url) =>
              Request.put(`${url}/v1/sandbox/${id}/file${envFile.path}`).pipe(
                Request.bodyText(envFile.contents, "application/octet-stream")
              )
            );
          }

          return yield* execute(command, sink, options, envFile);
        })
      ),
    home: HOME,
    id,
    provider: "cloudflare",
    resumable: Option.none(),
    writeFile: (path, content) =>
      execute(
        `mkdir -p ${shellQuote(dirname(path))} && printf %s ${shellQuote(Buffer.from(content).toString("base64"))} | base64 -d > ${shellQuote(path)}`,
        SILENT
      ).pipe(
        Effect.filterOrFail(
          (exitCode) => exitCode === 0,
          (exitCode) => unavailable(`Cloudflare file write exited ${exitCode}`)
        ),
        Effect.asVoid
      ),
  };
};
