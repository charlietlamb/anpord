import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest as Request,
} from "@effect/platform";
import { Effect, Schema } from "effect";
import { shellQuote } from "../harness/process";
import { configuration, decoded, environment } from "./cloudflare-bridge";
import {
  type Bridge,
  bridgeRequest,
  handleFor,
  WRITABLE_ROOT,
} from "./cloudflare-handle";
import { type MakeAdapter, providerAdapter } from "./provider-adapter";
import { runCommand } from "./run-command";

const SandboxResponse = Schema.Struct({ id: Schema.String });

export const cloudflareAdapter: MakeAdapter = (values) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const env = yield* environment;
    const bridge: Bridge = {
      client,
      configured: yield* Effect.cached(configuration(client, values, env)),
    };

    const destroy = (id: string) =>
      bridgeRequest(bridge, (url) => Request.del(`${url}/v1/sandbox/${id}`));

    return providerAdapter({
      connect: Effect.succeed,
      create: () =>
        bridgeRequest(bridge, (url) => Request.post(`${url}/v1/sandbox`)).pipe(
          Effect.flatMap(decoded(SandboxResponse)),
          Effect.map((response) => response.id)
        ),
      destroy,
      discard: destroy,
      handleFor: (id, workspace) => handleFor(id, workspace, bridge),
      home: WRITABLE_ROOT,
      makeWorkspace: (id, workspace) =>
        runCommand(
          handleFor(id, workspace, bridge),
          `mkdir -p ${shellQuote(workspace)}`,
          { cwd: WRITABLE_ROOT }
        ),
      provider: "cloudflare",
    });
  }).pipe(Effect.provide(FetchHttpClient.layer), Effect.orDie);
