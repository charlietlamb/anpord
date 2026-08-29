import {
  REPOSITORY_PAGE_SIZE,
  type Repository,
} from "@anpord/schema/domain/codebase";
import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { CodebaseError } from "./errors";

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

/* An installation lists its repositories under a key rather than as a bare
   array, which is the one shape difference from listing a user's own. */
const InstallationRepos = Schema.Struct({
  repositories: Schema.Array(GithubRepo),
});

const Installation = Schema.Struct({
  account: Schema.Struct({ login: Schema.String }),
  id: Schema.Number,
  repository_selection: Schema.Literal("all", "selected"),
});

const decodeRepos = Schema.decodeUnknown(InstallationRepos);
const decodeInstallation = Schema.decodeUnknown(Installation);

export interface InstallationAccount {
  readonly id: number;
  readonly login: string;
  readonly repositorySelection: "all" | "selected";
}

export interface GithubRepositoriesShape {
  /** The account the app is installed on, read with the app's own JWT. */
  readonly installation: (
    jwt: Redacted.Redacted<string>,
    installationId: number
  ) => Effect.Effect<InstallationAccount, CodebaseError>;
  readonly list: (
    token: Redacted.Redacted<string>
  ) => Effect.Effect<readonly Repository[], CodebaseError>;
}

export class GithubRepositories extends Context.Tag(
  "@anpord/eval/GithubRepositories"
)<GithubRepositories, GithubRepositoriesShape>() {}

const unreadable = (what: string) => (cause: unknown) =>
  new CodebaseError({ cause, message: `GitHub sent an unreadable ${what}` });

export const GithubRepositoriesLive = Layer.effect(
  GithubRepositories,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;

    const get = (token: Redacted.Redacted<string>, path: string) =>
      HttpClientRequest.get(`${API}${path}`).pipe(
        HttpClientRequest.setHeaders({
          accept: "application/vnd.github+json",
          authorization: `Bearer ${Redacted.value(token)}`,
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
      installation: (jwt, installationId) =>
        get(jwt, `/app/installations/${installationId}`).pipe(
          Effect.flatMap((body) =>
            decodeInstallation(body).pipe(
              Effect.mapError(unreadable("installation"))
            )
          ),
          Effect.map((found) => ({
            id: found.id,
            login: found.account.login,
            repositorySelection: found.repository_selection,
          })),
          Effect.withSpan("GithubRepositories.installation"),
          Effect.annotateLogs({ installationId })
        ),

      list: (token) =>
        get(
          token,
          `/installation/repositories?per_page=${REPOSITORY_PAGE_SIZE}&sort=pushed`
        ).pipe(
          Effect.flatMap((body) =>
            decodeRepos(body).pipe(
              Effect.mapError(unreadable("repository list"))
            )
          ),
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
