import { Effect, Option } from "effect";
import { openAiKeyFor } from "../credentials/openai-key";
import type { CredentialResolverShape } from "../credentials/resolver";
import { UserUnavailable } from "../domain/errors";
import type { StartGrid } from "./run";

/* A case that states a human needs a model to play them. Checked before any
   sandbox opens: the failure is a missing credential, and finding it a trial
   later costs a provisioned sandbox to say the same thing. */
export const assertUserReachable = (
  credentials: CredentialResolverShape,
  input: StartGrid
) =>
  Effect.gen(function* () {
    const simulated = input.cases.some(
      (subject) => subject.user?.kind === "simulated"
    );

    if (!simulated) {
      return;
    }

    const key = yield* openAiKeyFor(credentials, input.organizationId);

    if (Option.isNone(key)) {
      return yield* Effect.fail(
        new UserUnavailable({
          reason:
            "this run states a human, which needs an OpenAI credential to play them. Connect one under settings, connections",
        })
      );
    }
  });
