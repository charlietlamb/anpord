import { createSign } from "node:crypto";
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";
import { CodebaseError } from "./errors";

/** GitHub rejects a JWT older than ten minutes; nine leaves room for skew. */
const JWT_TTL_SECONDS = 540;
const CLOCK_SKEW_SECONDS = 60;
const MILLIS = 1000;

const InstallationToken = Schema.Struct({ token: Schema.String });
const decodeToken = Schema.decodeUnknown(InstallationToken);

export interface GithubAppConfigShape {
  readonly appId: string;
  readonly privateKey: Redacted.Redacted<string>;
  readonly slug: string;
}

export class GithubAppConfig extends Context.Tag(
  "@anpord/eval/GithubAppConfig"
)<GithubAppConfig, GithubAppConfigShape | undefined>() {}

const base64 = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/* Signed locally: GitHub has no endpoint that issues one. */
const appJwt = (config: GithubAppConfigShape, now: number) =>
  Effect.try({
    catch: (cause) =>
      new CodebaseError({ cause, message: "Could not sign the GitHub app" }),
    try: () => {
      const issued = Math.floor(now / MILLIS) - CLOCK_SKEW_SECONDS;
      const header = base64({ alg: "RS256", typ: "JWT" });
      const payload = base64({
        exp: issued + JWT_TTL_SECONDS,
        iat: issued,
        iss: config.appId,
      });
      const signer = createSign("RSA-SHA256");

      signer.update(`${header}.${payload}`);

      return `${header}.${payload}.${signer.sign(
        Redacted.value(config.privateKey),
        "base64url"
      )}`;
    },
  });

export interface GithubAppShape {
  readonly installUrl: (state: string) => string;
  readonly jwt: Effect.Effect<Redacted.Redacted<string>, CodebaseError>;
  readonly manageUrl: (installationId: number) => string;
  /* Scoped to one installation, and expires after an hour. */
  readonly tokenFor: (
    installationId: number
  ) => Effect.Effect<Redacted.Redacted<string>, CodebaseError>;
}

export class GithubApp extends Context.Tag("@anpord/eval/GithubApp")<
  GithubApp,
  GithubAppShape | undefined
>() {}

export const GithubAppConfigLive = Layer.effect(
  GithubAppConfig,
  Effect.gen(function* () {
    const appId = yield* Config.string("GITHUB_APP_ID").pipe(
      Config.withDefault("")
    );
    const slug = yield* Config.string("GITHUB_APP_SLUG").pipe(
      Config.withDefault("")
    );
    const privateKey = yield* Config.redacted("GITHUB_APP_PRIVATE_KEY").pipe(
      Config.withDefault(Redacted.make(""))
    );

    /* Undefined without all three, so an unregistered environment reads as
       feature-off rather than failing every call with a signature error. */
    return appId && slug && Redacted.value(privateKey)
      ? { appId, privateKey, slug }
      : undefined;
  })
);

export const GithubAppLive = Layer.effect(
  GithubApp,
  Effect.gen(function* () {
    const config = yield* GithubAppConfig;

    if (config === undefined) {
      return;
    }

    return {
      installUrl: (state) =>
        `https://github.com/apps/${config.slug}/installations/new?state=${encodeURIComponent(state)}`,

      jwt: Effect.clockWith((clock) => clock.currentTimeMillis).pipe(
        Effect.flatMap((now) => appJwt(config, now)),
        Effect.map(Redacted.make)
      ),

      manageUrl: (installationId) =>
        `https://github.com/settings/installations/${installationId}`,

      tokenFor: (installationId) =>
        Effect.gen(function* () {
          const now = yield* Effect.clockWith(
            (clock) => clock.currentTimeMillis
          );
          const jwt = yield* appJwt(config, now);

          const response = yield* Effect.tryPromise({
            catch: (cause) =>
              new CodebaseError({ cause, message: "GitHub is unreachable" }),
            try: () =>
              fetch(
                `https://api.github.com/app/installations/${installationId}/access_tokens`,
                {
                  headers: {
                    accept: "application/vnd.github+json",
                    authorization: `Bearer ${jwt}`,
                    "x-github-api-version": "2022-11-28",
                  },
                  method: "POST",
                }
              ),
          });

          if (!response.ok) {
            return yield* Effect.fail(
              new CodebaseError({
                message: `GitHub refused an installation token (${response.status})`,
              })
            );
          }

          const body = yield* Effect.tryPromise({
            catch: (cause) =>
              new CodebaseError({ cause, message: "GitHub sent no token" }),
            try: () => response.json(),
          });

          const decoded = yield* decodeToken(body).pipe(
            Effect.mapError(
              (cause) =>
                new CodebaseError({
                  cause,
                  message: "GitHub sent an unreadable token",
                })
            )
          );

          return Redacted.make(decoded.token);
        }).pipe(
          Effect.withSpan("GithubApp.tokenFor"),
          Effect.annotateLogs({ installationId })
        ),
    };
  })
);
