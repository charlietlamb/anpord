import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { Config, Effect, Schema } from "effect";
import { sandboxUnavailable } from "../../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { execStream } from "./exec-stream";
import { noCache, notResumable } from "./not-resumable";
import { runCommand } from "./run-command";

const DEFAULT_TIMEOUT_MS = 120_000;
const HOME = "/home/sandbox";
const WORKER = "anpord-sandbox-bridge";
const WORKSPACE = "/workspace";
const ERROR_BODY_LIMIT = 300;
const WHITESPACE = /\s+/g;
const TRAILING_SLASH = /\/$/;

const AccountsResponse = Schema.Struct({
  result: Schema.Array(Schema.Struct({ id: Schema.String })),
});
const SubdomainResponse = Schema.Struct({
  result: Schema.Struct({ subdomain: Schema.String }),
});
const SandboxResponse = Schema.Struct({ id: Schema.String });
const ExitEvent = Schema.Struct({ exit_code: Schema.Number });
const ErrorEvent = Schema.Struct({ error: Schema.String });

interface Configuration {
  readonly key: string;
  readonly url: string;
}

interface Environment {
  readonly apiToken: string;
  readonly sandboxApiKey: string;
  readonly sandboxUrl: string;
}

const environment = Config.all({
  apiToken: Config.string("CLOUDFLARE_API_TOKEN").pipe(Config.withDefault("")),
  sandboxApiKey: Config.string("CLOUDFLARE_SANDBOX_API_KEY").pipe(
    Config.withDefault("")
  ),
  sandboxUrl: Config.string("CLOUDFLARE_SANDBOX_URL").pipe(
    Config.withDefault("")
  ),
});

interface ExecSink {
  readonly stderr: (data: string) => void;
  readonly stdout: (data: string) => void;
}

const unavailable = (reason: unknown) =>
  sandboxUnavailable("cloudflare", reason);

const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const ensure = async (response: Response) => {
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

const configuration = async (
  values: Readonly<Record<string, string>> | undefined,
  env: Environment
): Promise<Configuration> => {
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

const readEvents = async (response: Response, sink: ExecSink) => {
  if (response.body === null) {
    throw new Error("Cloudflare returned no command stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let exitCode: number | undefined;

  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value, { stream: !chunk.done });

    for (
      let end = buffer.indexOf("\n\n");
      end >= 0;
      end = buffer.indexOf("\n\n")
    ) {
      const lines = buffer.slice(0, end).split("\n");
      buffer = buffer.slice(end + 2);
      const event = lines.find((line) => line.startsWith("event: "))?.slice(7);
      const data = lines
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n");

      if (event === "stdout" || event === "stderr") {
        sink[event](Buffer.from(data, "base64").toString());
      } else if (event === "exit") {
        exitCode = Schema.decodeUnknownSync(ExitEvent)(
          JSON.parse(data)
        ).exit_code;
      } else if (event === "error") {
        throw new Error(
          Schema.decodeUnknownSync(ErrorEvent)(JSON.parse(data)).error
        );
      }
    }

    if (chunk.done) {
      break;
    }
  }

  if (exitCode === undefined) {
    throw new Error("Cloudflare command stream ended without an exit code");
  }
  return exitCode;
};

const handleFor = (
  id: string,
  workspace: string,
  configured: Promise<Configuration>
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
