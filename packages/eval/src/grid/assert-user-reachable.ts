import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import { Config, Effect, Option, Redacted } from "effect";
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

    /* An empty variable is set but unusable, and passing preflight on one
       moves the failure back to where it cost a sandbox to discover. */
    const platformKey = yield* Config.option(Config.string("OPENAI_API_KEY"));

    if (Option.exists(platformKey, (key) => key.trim() !== "")) {
      return;
    }

    const actor = Actor.make({
      id: UserId.make(input.organizationId),
      organizationId: OrganizationId.make(input.organizationId),
      isUser: false,
      permissions: [],
    });
    const stored = yield* credentials
      .resolve({ actor, integrationId: "openai" })
      .pipe(
        Effect.map((value) =>
          Option.fromNullable(Redacted.value(value).values.apiKey)
        ),
        Effect.catchAll(() => Effect.succeed(Option.none<string>()))
      );

    if (Option.isNone(stored)) {
      return yield* Effect.fail(
        new UserUnavailable({
          reason:
            "this run states a human, which needs an OpenAI credential to play them. Connect one under settings, connections",
        })
      );
    }
  });
