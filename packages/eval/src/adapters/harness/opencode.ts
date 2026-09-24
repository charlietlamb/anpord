import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Either, Option } from "effect";
import type { RunHarness } from "../../ports/harness";
import type { Material } from "./json-driver";
import { opencodeConfigEnv } from "./opencode-config";
import { shellQuote } from "./process";

export const opencodeCommand = (request: RunHarness) =>
  [
    `cd ${shellQuote(request.workspace)}`,
    "&&",
    "~/.opencode/bin/opencode run --format json",
    "--auto",
    `--model ${shellQuote(request.model)}`,
    shellQuote(request.prompt),
    "< /dev/null",
  ].join(" ");

export const opencodeRunEnv = (request: RunHarness) =>
  Option.match(request.systemPromptPath, {
    onNone: () => request.env,
    onSome: (path) => opencodeConfigEnv(request.env, path),
  });

const WITHOUT_MODELS_FETCH = { OPENCODE_DISABLE_MODELS_FETCH: "1" };

export const opencodeMaterial = (
  credential: ResolvedCredential
): Either.Either<Material, string> => {
  if (credential.integrationId === "env") {
    return Either.right({ env: WITHOUT_MODELS_FETCH });
  }

  const authJson = credential.values.authJson;

  return authJson
    ? Either.right({
        env: { ...WITHOUT_MODELS_FETCH, OPENCODE_AUTH_CONTENT: authJson },
      })
    : Either.left(
        "Credential material is incomplete or does not match harness"
      );
};
