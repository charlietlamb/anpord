import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Effect, Either, Option, Redacted } from "effect";
import type { PrepareHarness, RunHarness } from "../../ports/harness";
import { CODEX_AUTH_FILE, readRotatedAuth } from "./codex-rotation";
import { binPath } from "./install";
import type { Material } from "./json-driver";
import { shellQuote } from "./process";

const developerInstructions = (request: RunHarness) =>
  Option.match(request.profile, {
    onNone: (): string[] => [],
    onSome: (profile) =>
      profile.systemPrompt === null
        ? []
        : [
            `-c ${shellQuote(`developer_instructions=${JSON.stringify(profile.systemPrompt)}`)}`,
          ],
  });

export const codexCommand = (request: RunHarness) =>
  [
    `cd ${shellQuote(request.workspace)}`,
    "&&",
    `${binPath("codex")} exec`,
    ...(Option.isSome(request.resume) ? ["resume"] : []),
    "--json --skip-git-repo-check",
    "--dangerously-bypass-approvals-and-sandbox",
    ...developerInstructions(request),
    ...(request.model === "" ? [] : [`--model ${shellQuote(request.model)}`]),
    ...Option.match(request.resume, {
      onNone: (): string[] => [],
      onSome: (session) => [shellQuote(session)],
    }),
    shellQuote(request.prompt),
    "< /dev/null",
  ].join(" ");

const authOf = (
  credential: ResolvedCredential
): Either.Either<string, string> => {
  if (credential.authMethodId === "api-key" && credential.values.apiKey) {
    return Either.right(
      JSON.stringify({
        auth_mode: "apikey",
        OPENAI_API_KEY: credential.values.apiKey,
      })
    );
  }

  return Either.fromNullable(credential.values.authJson || undefined, () =>
    credential.integrationId === "env"
      ? "Codex needs its own credential; an environment credential carries no auth.json"
      : "Credential material is incomplete"
  );
};

export const codexMaterial = (credential: ResolvedCredential) =>
  Either.map(
    authOf(credential),
    (auth): Material => ({ env: {}, files: { [CODEX_AUTH_FILE]: auth } })
  );

export const captureCodexRotation = (input: PrepareHarness) => {
  const credential = Redacted.value(input.credential);

  return credential.authMethodId === "api-key"
    ? Effect.succeedNone
    : readRotatedAuth(input.sandbox, input.home).pipe(
        Effect.map(
          Option.filter((authJson) => authJson !== credential.values.authJson)
        ),
        Effect.map(Option.map((authJson) => ({ authJson })))
      );
};
