import { Effect, Schema } from "effect";
import type {
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import {
  configuration,
  ensure,
  environment,
  unavailable,
} from "./cloudflare-bridge";
import { handleFor, quoted } from "./cloudflare-handle";
import { runCommand } from "./run-command";

const WORKSPACE = "/workspace";

const SandboxResponse = Schema.Struct({ id: Schema.String });

export const makeConfiguredCloudflareAdapter = (
  values?: Readonly<Record<string, string>>
) =>
  Effect.gen(function* () {
    const env = yield* environment;
    const configured = configuration(values, env);
    const destroy = (handle: Pick<SandboxHandle, "id">) =>
      Effect.tryPromise({
        catch: unavailable,
        try: async () => {
          const { key, url } = await configured;
          await ensure(
            await fetch(`${url}/v1/sandbox/${handle.id}`, {
              headers: { Authorization: `Bearer ${key}` },
              method: "DELETE",
            })
          );
        },
      });

    return {
      attach: (id) => Effect.succeed(handleFor(id, WORKSPACE, configured)),
      destroy,
      open: (request: OpenSandbox) =>
        Effect.tryPromise({
          catch: unavailable,
          try: async () => {
            const { key, url } = await configured;
            const response = await ensure(
              await fetch(`${url}/v1/sandbox`, {
                headers: { Authorization: `Bearer ${key}` },
                method: "POST",
              })
            );
            return Schema.decodeUnknownSync(SandboxResponse)(
              await response.json()
            ).id;
          },
        }).pipe(
          Effect.flatMap((id) => {
            const handle = handleFor(id, request.workspace, configured);
            return runCommand(handle, `mkdir -p ${quoted(request.workspace)}`, {
              cwd: WORKSPACE,
            }).pipe(
              Effect.as(handle),
              Effect.tapError(() => destroy(handle).pipe(Effect.ignore))
            );
          })
        ),
      provider: "cloudflare",
    } satisfies SandboxAdapterShape;
  }).pipe(Effect.orDie);

export const makeCloudflareAdapter = makeConfiguredCloudflareAdapter();
