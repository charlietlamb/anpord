import type {
  CredentialAuthMethod,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { Effect } from "effect";
import { CredentialError } from "./errors";

const field = (
  name: string,
  label: string,
  options: {
    readonly hint?: string;
    readonly required?: boolean;
    readonly secret?: boolean;
  } = {}
) => ({
  ...(options.hint === undefined ? {} : { hint: options.hint }),
  label,
  name,
  required: options.required ?? true,
  secret: options.secret ?? true,
});

const secret = (
  id: string,
  label: string,
  fields: CredentialAuthMethod["fields"]
): CredentialAuthMethod => ({ fields, id, kind: "secret", label });

export const credentialIntegrations: readonly CredentialIntegration[] = [
  {
    authMethods: [
      secret("api-key", "API key", [field("apiKey", "API key")]),
      { fields: [], id: "chatgpt", kind: "device", label: "ChatGPT" },
    ],
    category: "harness",
    id: "codex",
    label: "Codex",
  },
  {
    authMethods: [
      secret("auth-json", "Auth file", [
        field("authJson", "Auth JSON", { hint: "Contents of auth.json" }),
      ]),
    ],
    category: "harness",
    id: "opencode",
    label: "OpenCode",
  },
  {
    authMethods: [
      secret("auth-json", "Auth file", [
        field("authJson", "Auth JSON", { hint: "Contents of auth.json" }),
      ]),
    ],
    category: "harness",
    id: "pi",
    label: "Pi",
  },
  {
    authMethods: [
      secret("api-key", "AI Gateway key", [field("apiKey", "API key")]),
      secret("chatgpt-auth", "ChatGPT auth file", [
        field("authJson", "Auth JSON", { hint: "Contents of auth.json" }),
      ]),
    ],
    category: "harness",
    id: "fx",
    label: "FX",
  },
  {
    authMethods: [secret("api-key", "API key", [field("apiKey", "API key")])],
    category: "harness",
    id: "claude",
    label: "Claude Code",
  },
  {
    authMethods: [secret("api-key", "API key", [field("apiKey", "API key")])],
    category: "harness",
    id: "gemini",
    label: "Gemini CLI",
  },
  {
    authMethods: [
      secret("api-key", "API key", [
        field("apiKey", "API key"),
        field("baseUrl", "Base URL", {
          hint: "https://api.example.com/v1",
          required: false,
          secret: false,
        }),
      ]),
    ],
    category: "harness",
    id: "qwen",
    label: "Qwen Code",
  },
  {
    authMethods: [secret("api-key", "API key", [field("apiKey", "API key")])],
    category: "harness",
    id: "cursor",
    label: "Cursor Agent",
  },
  {
    authMethods: [secret("api-key", "API key", [field("apiKey", "API key")])],
    category: "sandbox",
    id: "daytona",
    label: "Daytona",
  },
  {
    authMethods: [secret("api-key", "API key", [field("apiKey", "API key")])],
    category: "sandbox",
    id: "e2b",
    label: "E2B",
  },
  {
    authMethods: [secret("api-key", "API key", [field("apiKey", "API key")])],
    category: "sandbox",
    id: "upstash",
    label: "Upstash Box",
  },
  {
    authMethods: [
      secret("token", "Token", [
        field("tokenId", "Token ID", { hint: "ak-…" }),
        field("tokenSecret", "Token secret"),
      ]),
    ],
    category: "sandbox",
    id: "modal",
    label: "Modal",
  },
  {
    authMethods: [
      secret("api-token", "API token", [
        field("apiToken", "API token"),
        field("accountId", "Account ID", {
          hint: "32-character hex id",
          required: false,
          secret: false,
        }),
        field("sandboxApiKey", "Sandbox API key", { required: false }),
        field("sandboxUrl", "Sandbox URL", {
          hint: "https://sandbox.example.workers.dev",
          required: false,
          secret: false,
        }),
      ]),
    ],
    category: "sandbox",
    id: "cloudflare",
    label: "Cloudflare",
  },
  {
    authMethods: [
      secret("token", "Token", [
        field("token", "Token"),
        field("teamId", "Team ID", { hint: "team_…", secret: false }),
        field("projectId", "Project ID", { hint: "prj_…", secret: false }),
      ]),
    ],
    category: "sandbox",
    id: "vercel",
    label: "Vercel",
  },
];

export const credentialMethod = (integrationId: string, methodId: string) => {
  const integration = credentialIntegrations.find(
    (candidate) => candidate.id === integrationId
  );
  const method = integration?.authMethods.find(
    (candidate) => candidate.id === methodId
  );

  return integration === undefined || method === undefined
    ? Effect.fail(
        new CredentialError({ message: "Unknown authentication method" })
      )
    : Effect.succeed({ integration, method });
};

export const validateCredential = (
  integrationId: string,
  methodId: string,
  values: Readonly<Record<string, string>>
) =>
  Effect.gen(function* () {
    const { method } = yield* credentialMethod(integrationId, methodId);
    const missing = method.fields.find(
      (item) => item.required && !values[item.name]?.trim()
    );

    if (missing !== undefined) {
      return yield* Effect.fail(
        new CredentialError({ message: `${missing.label} is required` })
      );
    }

    if (method.kind === "device") {
      const authJson = values.authJson?.trim();
      return authJson
        ? { authJson }
        : yield* Effect.fail(
            new CredentialError({
              message: "Device authentication is incomplete",
            })
          );
    }

    return Object.fromEntries(
      method.fields.flatMap((item) => {
        const value = values[item.name]?.trim();
        return value ? [[item.name, value]] : [];
      })
    );
  });
