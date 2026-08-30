import type { OrganizationId } from "@anpord/schema/domain/actor";
import { Context, Effect, Layer, Option, type Redacted } from "effect";
import { GithubApp } from "./github-app";
import { Installations } from "./installations";

export interface SourceTokensShape {
  readonly forOrganization: (
    organizationId: string
  ) => Effect.Effect<Option.Option<Redacted.Redacted<string>>>;
}

export class SourceTokens extends Context.Tag("@anpord/eval/SourceTokens")<
  SourceTokens,
  SourceTokensShape
>() {}

/**
 * The credential a run clones with.
 *
 * Absent rather than failing when there is no app, no installation, or GitHub
 * will not issue a token: a public repository clones without one, and refusing
 * the run would stop work that was going to succeed. A private repository
 * still fails at the clone, where the error already says the app is not
 * installed on it.
 */
/** No installation, so every clone is unauthenticated -- which is what a test
 * against a public repository, or none at all, actually wants. */
export const SourceTokensNone = Layer.succeed(
  SourceTokens,
  SourceTokens.of({ forOrganization: () => Effect.succeed(Option.none()) })
);

export const SourceTokensLive = Layer.effect(
  SourceTokens,
  Effect.gen(function* () {
    const app = yield* GithubApp;
    const installations = yield* Installations;

    return SourceTokens.of({
      forOrganization: (organizationId) =>
        Effect.gen(function* () {
          if (app === undefined) {
            return Option.none();
          }

          const installation = yield* installations.forOrganization({
            organizationId: organizationId as OrganizationId,
          });

          if (Option.isNone(installation)) {
            return Option.none();
          }

          return Option.some(yield* app.tokenFor(installation.value.id));
        }).pipe(
          Effect.withSpan("SourceTokens.forOrganization"),
          Effect.annotateLogs({ organizationId }),
          Effect.catchAll((error) =>
            Effect.logWarning(
              "could not mint an installation token; private repositories will not clone",
              error
            ).pipe(Effect.as(Option.none()))
          )
        ),
    });
  })
);
