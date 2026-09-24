import { createHash } from "node:crypto";
import type { CredentialValues } from "@anpord/schema/domain/credentials";
import {
  type HttpClient,
  type HttpClientRequest,
  type HttpClientResponse,
  HttpClientRequest as Request,
} from "@effect/platform";
import { Config, Effect, Schema } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import { unavailableFor } from "./provider-adapter";

const WORKER = "anpord-sandbox-bridge";
const ERROR_BODY_LIMIT = 300;
const WHITESPACE = /\s+/g;
const TRAILING_SLASH = /\/$/;

const AccountsResponse = Schema.Struct({
  result: Schema.Array(Schema.Struct({ id: Schema.String })),
});
const SubdomainResponse = Schema.Struct({
  result: Schema.Struct({ subdomain: Schema.String }),
});

export interface BridgeConfiguration {
  readonly key: string;
  readonly url: string;
}

const optional = (name: string) =>
  Config.string(name).pipe(Config.withDefault(""));

export const environment = Config.all({
  apiToken: optional("CLOUDFLARE_API_TOKEN"),
  sandboxApiKey: optional("CLOUDFLARE_SANDBOX_API_KEY"),
  sandboxUrl: optional("CLOUDFLARE_SANDBOX_URL"),
});

type Environment = Config.Config.Success<typeof environment>;

export const unavailable = unavailableFor("cloudflare");

export const send = (
  client: HttpClient.HttpClient,
  request: HttpClientRequest.HttpClientRequest
): Effect.Effect<HttpClientResponse.HttpClientResponse, SandboxUnavailable> =>
  client.execute(request).pipe(
    Effect.flatMap((response) =>
      response.status >= 200 && response.status < 300
        ? Effect.succeed(response)
        : response.text.pipe(
            Effect.orElseSucceed(() => ""),
            Effect.flatMap((body) =>
              Effect.fail(
                new Error(
                  `${response.status}: ${body.replace(WHITESPACE, " ").trim().slice(0, ERROR_BODY_LIMIT)}`
                )
              )
            )
          )
    ),
    Effect.mapError(unavailable)
  );

export const decoded =
  <A, I>(schema: Schema.Schema<A, I>) =>
  (response: HttpClientResponse.HttpClientResponse) =>
    response.json.pipe(
      Effect.flatMap(Schema.decodeUnknown(schema)),
      Effect.mapError(unavailable)
    );

const cloudflare =
  (client: HttpClient.HttpClient, token: string) =>
  <A, I>(path: string, schema: Schema.Schema<A, I>) =>
    send(
      client,
      Request.get(`https://api.cloudflare.com/client/v4${path}`).pipe(
        Request.bearerToken(token)
      )
    ).pipe(Effect.flatMap(decoded(schema)));

const bridgeUrl = (
  client: HttpClient.HttpClient,
  token: string,
  accountId: string | undefined
) =>
  Effect.gen(function* () {
    const api = cloudflare(client, token);
    const accounts = accountId
      ? [{ id: accountId }]
      : (yield* api("/accounts", AccountsResponse)).result;
    const [account, ...others] = accounts;

    if (account === undefined) {
      return yield* Effect.fail(
        unavailable("The Cloudflare token has no account")
      );
    }
    if (others.length > 0) {
      return yield* Effect.fail(
        unavailable("Set CLOUDFLARE_SANDBOX_URL for a multi-account token")
      );
    }

    const { result } = yield* api(
      `/accounts/${account.id}/workers/subdomain`,
      SubdomainResponse
    );

    return `https://${WORKER}.${result.subdomain}.workers.dev`;
  });

export const configuration = (
  client: HttpClient.HttpClient,
  values: CredentialValues | undefined,
  env: Environment
): Effect.Effect<BridgeConfiguration, SandboxUnavailable> =>
  Effect.gen(function* () {
    const token = values?.apiToken || env.apiToken || undefined;
    const key =
      values?.sandboxApiKey ||
      env.sandboxApiKey ||
      (token === undefined
        ? undefined
        : createHash("sha256")
            .update(`anpord-cloudflare-sandbox:${token}`)
            .digest("hex"));
    const url =
      values?.sandboxUrl ||
      env.sandboxUrl ||
      (token === undefined
        ? undefined
        : yield* bridgeUrl(client, token, values?.accountId));

    if (key === undefined || url === undefined) {
      return yield* Effect.fail(
        unavailable("Cloudflare Sandbox bridge credentials are not configured")
      );
    }

    return { key, url: url.replace(TRAILING_SLASH, "") };
  });
