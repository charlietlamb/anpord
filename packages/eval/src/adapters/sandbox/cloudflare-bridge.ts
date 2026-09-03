import { createHash } from "node:crypto";
import { Config, Schema } from "effect";
import { sandboxUnavailable } from "../../domain/errors";

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

interface Environment {
  readonly apiToken: string;
  readonly sandboxApiKey: string;
  readonly sandboxUrl: string;
}

export const environment = Config.all({
  apiToken: Config.string("CLOUDFLARE_API_TOKEN").pipe(Config.withDefault("")),
  sandboxApiKey: Config.string("CLOUDFLARE_SANDBOX_API_KEY").pipe(
    Config.withDefault("")
  ),
  sandboxUrl: Config.string("CLOUDFLARE_SANDBOX_URL").pipe(
    Config.withDefault("")
  ),
});

export const unavailable = (reason: unknown) =>
  sandboxUnavailable("cloudflare", reason);

export const ensure = async (response: Response) => {
  if (!response.ok) {
    const body = (await response.text())
      .replace(WHITESPACE, " ")
      .trim()
      .slice(0, ERROR_BODY_LIMIT);
    throw new Error(`${response.status}: ${body || response.statusText}`);
  }
  return response;
};

const cloudflare = async (path: string, token: string) =>
  ensure(
    await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).then((response) => response.json() as Promise<{ result: unknown }>);

export const configuration = async (
  values: Readonly<Record<string, string>> | undefined,
  env: Environment
): Promise<BridgeConfiguration> => {
  const token = values?.apiToken || env.apiToken || undefined;
  const key =
    values?.sandboxApiKey ||
    env.sandboxApiKey ||
    (token === undefined
      ? undefined
      : createHash("sha256")
          .update(`anpord-cloudflare-sandbox:${token}`)
          .digest("hex"));
  let url = values?.sandboxUrl || env.sandboxUrl || undefined;

  if (url === undefined && token !== undefined) {
    const accounts = values?.accountId
      ? [{ id: values.accountId }]
      : Schema.decodeUnknownSync(AccountsResponse)(
          await cloudflare("/accounts", token)
        ).result;
    if (accounts.length !== 1) {
      throw new Error("Set CLOUDFLARE_SANDBOX_URL for a multi-account token");
    }
    const account = accounts[0];
    if (account === undefined) {
      throw new Error("The Cloudflare token has no account");
    }
    const subdomain = Schema.decodeUnknownSync(SubdomainResponse)(
      await cloudflare(`/accounts/${account.id}/workers/subdomain`, token)
    ).result;
    url = `https://${WORKER}.${subdomain.subdomain}.workers.dev`;
  }

  if (key === undefined || url === undefined) {
    throw new Error("Cloudflare Sandbox bridge credentials are not configured");
  }

  return { key, url: url.replace(TRAILING_SLASH, "") };
};
