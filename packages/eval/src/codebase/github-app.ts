import { createSign } from "node:crypto";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse,
} from "@effect/platform";
import {
  Clock,
  Config,
  Context,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
} from "effect";
import { CodebaseError } from "./errors";
import { githubRequest } from "./github-request";

const JWT_TTL_SECONDS = 540;
const CLOCK_SKEW_SECONDS = 60;
const MILLIS = 1000;

const InstallationToken = Schema.Struct({ token: Schema.String });

interface GithubAppConfigShape {
  readonly appId: string;
  readonly privateKey: Redacted.Redacted<string>;
  readonly slug: string;
}

export class GithubAppConfig extends Context.Tag(
  "@anpord/eval/GithubAppConfig"
)<GithubAppConfig, Option.Option<GithubAppConfigShape>>() {}

const failureOf = (tag: "ParseError" | "RequestError" | "ResponseError") => {
  if (tag === "ParseError") {
    return "GitHub sent an unreadable token";
  }

  return tag === "RequestError"
    ? "GitHub is unreachable"
    : "GitHub refused an installation token";
};

const base64 = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const appJwt = (config: GithubAppConfigShape) =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;

    return yield* Effect.try({
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

        return Redacted.make(
          `${header}.${payload}.${signer.sign(
            Redacted.value(config.privateKey),
            "base64url"
          )}`
        );
      },
    });
  }).pipe(Effect.withSpan("GithubApp.jwt"));

export interface GithubAppShape {
  readonly installUrl: (state: string) => string;
  readonly jwt: Effect.Effect<Redacted.Redacted<string>, CodebaseError>;
  readonly manageUrl: (installationId: number) => string;
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

    return appId && slug && Redacted.value(privateKey)
      ? Option.some({ appId, privateKey, slug })
      : Option.none();
  })
);

export const GithubAppLive = Layer.effect(
  GithubApp,
  Effect.gen(function* () {
    const configured = yield* GithubAppConfig;
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk
    );

    if (Option.isNone(configured)) {
      return;
    }

    const config = configured.value;

    return {
      installUrl: (state) =>
        `https://github.com/apps/${config.slug}/installations/new?state=${encodeURIComponent(state)}`,

      jwt: appJwt(config),

      manageUrl: (installationId) =>
        `https://github.com/settings/installations/${installationId}`,

      tokenFor: (installationId) =>
        appJwt(config).pipe(
          Effect.flatMap((jwt) =>
            client
              .execute(
                githubRequest(
                  "POST",
                  `/app/installations/${installationId}/access_tokens`,
                  jwt
                )
              )
              .pipe(
                Effect.flatMap(
                  HttpClientResponse.schemaBodyJson(InstallationToken)
                ),
                Effect.mapError(
                  (cause) =>
                    new CodebaseError({ cause, message: failureOf(cause._tag) })
                ),
                Effect.scoped
              )
          ),
          Effect.map(({ token }) => Redacted.make(token)),
          Effect.withSpan("GithubApp.tokenFor"),
          Effect.annotateLogs({ installationId })
        ),
    } satisfies GithubAppShape;
  })
).pipe(Layer.provide(FetchHttpClient.layer));
