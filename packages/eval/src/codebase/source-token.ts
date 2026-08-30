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

          const installation =
            yield* installations.forOrganization(organizationId);

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
            ).pipe(Effect.as(Option.none<Redacted.Redacted<string>>()))
          )
        ),
    });
  })
);
