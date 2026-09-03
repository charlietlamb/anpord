import { dirname } from "node:path";
import { Effect } from "effect";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";
import {
  type BridgeConfiguration,
  ensure,
  unavailable,
} from "./cloudflare-bridge";
import { type ExecSink, readEvents } from "./cloudflare-events";
import { execStream } from "./exec-stream";
import { noCache, notResumable } from "./not-resumable";

const DEFAULT_TIMEOUT_MS = 120_000;
const HOME = "/home/sandbox";

export const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const commandFor = (
  workspace: string,
  command: string,
  options?: ExecOptions
) => {
  const environment = Object.entries(options?.env ?? {}).map(([key, value]) =>
    quoted(`${key}=${value}`)
  );
  const env = environment.length === 0 ? "" : `env ${environment.join(" ")} `;
  return `cd ${quoted(options?.cwd ?? workspace)} && ${env}bash -lc ${quoted(command)}`;
};

export const handleFor = (
  id: string,
  workspace: string,
  configured: Promise<BridgeConfiguration>
): SandboxHandle => {
  const execute = async (
    command: string,
    sink: ExecSink,
    options?: ExecOptions
  ) => {
    const { key, url } = await configured;
    const response = await ensure(
      await fetch(`${url}/v1/sandbox/${id}/exec`, {
        body: JSON.stringify({
          argv: ["bash", "-lc", commandFor(workspace, command, options)],
          timeout_ms: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        }),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    );
    return readEvents(response, sink);
  };

  return {
    exec: (command, options) =>
      execStream((sink) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () => execute(command, sink, options),
        })
      ),
    home: HOME,
    id,
    provider: "cloudflare",
    ...noCache,
    ...notResumable("cloudflare"),
    streaming: true,
    writeFile: (path, content) =>
      Effect.tryPromise({
        catch: unavailable,
        try: async () => {
          const encoded = Buffer.from(content).toString("base64");
          const exitCode = await execute(
            `mkdir -p ${quoted(dirname(path))} && printf %s ${quoted(encoded)} | base64 -d > ${quoted(path)}`,
            { stderr: () => undefined, stdout: () => undefined }
          );
          if (exitCode !== 0) {
            throw new Error(`Cloudflare file write exited ${exitCode}`);
          }
        },
      }),
  };
};
