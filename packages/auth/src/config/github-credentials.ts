import { Config, Option, Redacted } from "effect";

export interface GithubCredentials {
  readonly clientId: string;
  readonly clientSecret: Redacted.Redacted<string>;
}

export const githubCredentials: Config.Config<GithubCredentials | undefined> =
  Config.all({
    clientId: Config.string("GITHUB_CLIENT_ID"),
    clientSecret: Config.redacted("GITHUB_CLIENT_SECRET"),
  }).pipe(
    Config.option,
    Config.map(
      Option.filter(
        ({ clientId, clientSecret }) =>
          clientId.trim().length > 0 &&
          Redacted.value(clientSecret).trim().length > 0
      )
    ),
    Config.map(Option.getOrUndefined)
  );
