import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { Redacted } from "effect";

const keyDir = process.env.EVAL_KEY_DIR;

const readKey = (name: string) => {
  if (keyDir === undefined) {
    return;
  }

  try {
    return readFileSync(`${keyDir}/${name}`, "utf8").trim();
  } catch {
    return;
  }
};

process.env.E2B_API_KEY ??= readKey("e2b.key");
process.env.DAYTONA_API_KEY ??= readKey("daytona.key");
process.env.UPSTASH_BOX_API_KEY ??= readKey("upstash-box.key");
process.env.MODAL_TOKEN_ID ??= readKey("modal-token-id.key");
process.env.MODAL_TOKEN_SECRET ??= readKey("modal-token-secret.key");
process.env.CLOUDFLARE_API_TOKEN ??= readKey("cloudflare-api-token.key");
process.env.CLOUDFLARE_SANDBOX_URL ??= readKey("cloudflare-sandbox-url.key");
process.env.CLOUDFLARE_SANDBOX_API_KEY ??= readKey(
  "cloudflare-sandbox-api-key.key"
);
process.env.VERCEL_OIDC_TOKEN ??= readKey("vercel-oidc-token.key");
process.env.VERCEL_TOKEN ??= readKey("vercel-token.key");
process.env.VERCEL_TEAM_ID ??= readKey("vercel-team-id.key");
process.env.VERCEL_PROJECT_ID ??= readKey("vercel-project-id.key");

const codexCredentials = (() => {
  try {
    return Redacted.make(
      readFileSync(`${homedir()}/.codex/auth.json`, "utf8").trim()
    );
  } catch {
    return;
  }
})();

/**
 * A harness credential shaped the way a resolver would return one.
 *
 * The trial now takes a resolved credential rather than a bare string, so a
 * test that reaches a real sandbox has to build one. Written once here because
 * four integration tests need the same thing and none of them is about the
 * shape of a credential.
 */
/* Stands in where a test is gated on a credential it does not have: the suite
   skips, and the shape still satisfies the trial. */
const NO_CREDENTIAL = Redacted.make({
  authMethodId: "none",
  connectionId: "none",
  integrationId: "codex",
  revision: 0,
  values: {},
});

export const codexCredential = codexCredentials
  ? Redacted.make({
      authMethodId: "auth-json",
      connectionId: "test-codex",
      integrationId: "codex",
      revision: 1,
      values: { authJson: Redacted.value(codexCredentials) },
    })
  : NO_CREDENTIAL;

export const hasDaytona = Boolean(process.env.DAYTONA_API_KEY);
export const hasUpstash = Boolean(process.env.UPSTASH_BOX_API_KEY);
export const hasModal = Boolean(
  process.env.MODAL_TOKEN_ID && process.env.MODAL_TOKEN_SECRET
);
export const hasCloudflare = Boolean(
  process.env.CLOUDFLARE_API_TOKEN ||
    (process.env.CLOUDFLARE_SANDBOX_URL &&
      process.env.CLOUDFLARE_SANDBOX_API_KEY)
);
export const hasVercel = Boolean(
  process.env.VERCEL_OIDC_TOKEN ||
    (process.env.VERCEL_TOKEN &&
      process.env.VERCEL_TEAM_ID &&
      process.env.VERCEL_PROJECT_ID)
);
export const hasCodex = Boolean(codexCredentials);
export const hasDatabase = Boolean(process.env.EVAL_TEST_DATABASE_URL);
