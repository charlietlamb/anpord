import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
} from "@effect/platform";
import { Data, Effect, Option, Redacted } from "effect";
import type { CheckRun } from "./github-check";
import type { GithubContext } from "./github-context";

const API = "https://api.github.com";
const FORBIDDEN = 403;

const statusOf = (cause: unknown) =>
  HttpClientError.isHttpClientError(cause) && cause._tag === "ResponseError"
    ? Option.some(cause.response.status)
    : Option.none<number>();

export class GithubCheckFailed extends Data.TaggedError("GithubCheckFailed")<{
  readonly cause: unknown;
  readonly status: Option.Option<number>;
}> {
  override get message() {
    return Option.match(this.status, {
      onNone: () => "GitHub could not be reached to post the check.",
      onSome: (status) =>
        status === FORBIDDEN
          ? "GitHub refused the check (403): the job's token cannot write checks, which is what a fork's token gets."
          : `GitHub answered ${status} to the check.`,
    });
  }
}

export const postCheckRun = (context: GithubContext, check: CheckRun) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk
    );
    const request = HttpClientRequest.post(
      `${API}/repos/${context.repository}/check-runs`
    ).pipe(
      HttpClientRequest.setHeaders({
        accept: "application/vnd.github+json",
        authorization: `Bearer ${Redacted.value(context.token)}`,
        "x-github-api-version": "2022-11-28",
      }),
      HttpClientRequest.bodyUnsafeJson({
        ...check,
        head_sha: context.sha,
        status: "completed",
      })
    );

    yield* client.execute(request);
  }).pipe(
    Effect.mapError(
      (cause) => new GithubCheckFailed({ cause, status: statusOf(cause) })
    ),
    Effect.scoped,
    Effect.withSpan("Cli.postCheckRun", {
      attributes: { repository: context.repository, sha: context.sha },
    })
  );
