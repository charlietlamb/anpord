import type { Repository } from "@anpord/schema/domain/codebase";
import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { CodebaseError } from "./errors";
import type { GithubToken } from "./github-token";

const API = "https://api.github.com";

/** What a picker needs. The payload carries far more per repository, and
 * decoding fields nobody reads would let a shape change upstream break a list
 * that would otherwise still be usable. */
const GithubRepo = Schema.Struct({
  clone_url: Schema.String,
  default_branch: Schema.String,
  full_name: Schema.String,
  private: Schema.Boolean,
});

const GithubUser = Schema.Struct({ login: Schema.String });

const decodeRepos = Schema.decodeUnknown(Schema.Array(GithubRepo));
const decodeUser = Schema.decodeUnknown(GithubUser);

/** One page is enough to choose from without being a list to scroll, and
 * GitHub sorts by recent activity, so the repository someone wants is near
 * the top. */
const PER_PAGE = 100;

export interface GithubRepositoriesShape {
  readonly list: (
    token: GithubToken
  ) => Effect.Effect<readonly Repository[], CodebaseError>;
  readonly login: (token: GithubToken) => Effect.Effect<string, CodebaseError>;
}

export class GithubRepositories extends Context.Tag(
  "@anpord/eval/GithubRepositories"
)<GithubRepositories, GithubRepositoriesShape>() {}

export const GithubRepositoriesLive = Layer.effect(
  GithubRepositories,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;

    const get = (token: GithubToken, path: string) =>
      HttpClientRequest.get(`${API}${path}`).pipe(
        HttpClientRequest.setHeaders({
          accept: "application/vnd.github+json",
          authorization: `Bearer ${Redacted.value(token.value)}`,
          "x-github-api-version": "2022-11-28",
        }),
        client.execute,
        Effect.flatMap((response) => response.json),
        Effect.mapError(
          (cause) =>
            new CodebaseError({ cause, message: "GitHub is unreachable" })
        ),
        Effect.scoped
      );

    return GithubRepositories.of({
      login: (token) =>
        get(token, "/user").pipe(
          Effect.flatMap((body) =>
            decodeUser(body).pipe(
              Effect.mapError(
                (cause) =>
                  new CodebaseError({
                    cause,
                    message: "GitHub returned an unreadable account",
                  })
              )
            )
          ),
          Effect.map((user) => user.login),
          Effect.withSpan("GithubRepositories.login")
        ),

      list: (token) =>
        get(
          token,
          `/user/repos?per_page=${PER_PAGE}&sort=pushed&affiliation=owner,collaborator,organization_member`
        ).pipe(
          Effect.flatMap((body) =>
            decodeRepos(body).pipe(
              Effect.mapError(
                (cause) =>
                  new CodebaseError({
                    cause,
                    message: "GitHub returned an unreadable repository list",
                  })
              )
            )
          ),
          Effect.map((repos) =>
            repos.map(
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
