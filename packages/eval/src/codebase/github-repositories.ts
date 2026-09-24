import {
  REPOSITORY_PAGE_SIZE,
  type Repository,
} from "@anpord/schema/domain/codebase";
import { HttpClient } from "@effect/platform";
import { Context, Effect, Layer, type Redacted, Schema } from "effect";
import { CodebaseError } from "./errors";
import { githubRequest } from "./github-request";

const GithubRepo = Schema.Struct({
  clone_url: Schema.String,
  default_branch: Schema.String,
  full_name: Schema.String,
  private: Schema.Boolean,
});

const InstallationRepos = Schema.Struct({
  repositories: Schema.Array(GithubRepo),
});

const Installation = Schema.Struct({
  account: Schema.Struct({ login: Schema.String }),
  id: Schema.Number,
  repository_selection: Schema.Literal("all", "selected"),
});

export interface InstallationAccount {
  readonly id: number;
  readonly login: string;
  readonly repositorySelection: "all" | "selected";
}

export interface GithubRepositoriesShape {
  readonly installation: (
    jwt: Redacted.Redacted<string>,
    installationId: number
  ) => Effect.Effect<InstallationAccount, CodebaseError>;
  readonly installations: (
    jwt: Redacted.Redacted<string>
  ) => Effect.Effect<readonly InstallationAccount[], CodebaseError>;
  readonly list: (
    token: Redacted.Redacted<string>
  ) => Effect.Effect<readonly Repository[], CodebaseError>;
}

export class GithubRepositories extends Context.Tag(
  "@anpord/eval/GithubRepositories"
)<GithubRepositories, GithubRepositoriesShape>() {}

const accountOf = (found: typeof Installation.Type): InstallationAccount => ({
  id: found.id,
  login: found.account.login,
  repositorySelection: found.repository_selection,
});

export const GithubRepositoriesLive = Layer.effect(
  GithubRepositories,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;

    const get = <A, I>(
      token: Redacted.Redacted<string>,
      path: string,
      schema: Schema.Schema<A, I>,
      what: string
    ) =>
      client.execute(githubRequest("GET", path, token)).pipe(
        Effect.flatMap((response) => response.json),
        Effect.mapError(
          (cause) =>
            new CodebaseError({ cause, message: "GitHub is unreachable" })
        ),
        Effect.flatMap((body) =>
          Schema.decodeUnknown(schema)(body).pipe(
            Effect.mapError(
              (cause) =>
                new CodebaseError({
                  cause,
                  message: `GitHub sent an unreadable ${what}`,
                })
            )
          )
        ),
        Effect.scoped
      );

    return GithubRepositories.of({
      installations: (jwt) =>
        get(
          jwt,
          "/app/installations?per_page=100",
          Schema.Array(Installation),
          "installation list"
        ).pipe(
          Effect.map((found) => found.map(accountOf)),
          Effect.withSpan("GithubRepositories.installations")
        ),

      installation: (jwt, installationId) =>
        get(
          jwt,
          `/app/installations/${installationId}`,
          Installation,
          "installation"
        ).pipe(
          Effect.map(accountOf),
          Effect.withSpan("GithubRepositories.installation"),
          Effect.annotateLogs({ installationId })
        ),

      list: (token) =>
        get(
          token,
          `/installation/repositories?per_page=${REPOSITORY_PAGE_SIZE}&sort=pushed`,
          InstallationRepos,
          "repository list"
        ).pipe(
          Effect.map(({ repositories }) =>
            repositories.map(
              (repo): Repository => ({
                defaultBranch: repo.default_branch,
                fullName: repo.full_name,
                private: repo.private,
                url: repo.clone_url,
              })
            )
          ),
          Effect.withSpan("GithubRepositories.list")
        ),
    });
  })
);
