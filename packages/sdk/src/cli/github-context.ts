import { FileSystem } from "@effect/platform";
import { Config, Effect, Option, Redacted, Schema } from "effect";
import { note } from "./render";

export interface GithubContext {
  readonly repository: string;
  readonly sha: string;
  readonly token: Redacted.Redacted<string>;
}

/* An unset secret reaches a workflow step as an empty string rather than as
   an absent variable, so presence has to mean non-empty. */
const present = (value: string) => value.trim().length > 0;

const optionalString = (name: string) =>
  Config.string(name).pipe(Config.option, Config.map(Option.filter(present)));

const tokenConfig = Config.redacted("GITHUB_TOKEN").pipe(
  Config.option,
  Config.map(Option.filter((token) => present(Redacted.value(token))))
);

const PullRequestEvent = Schema.parseJson(
  Schema.Struct({
    pull_request: Schema.Struct({
      head: Schema.Struct({ sha: Schema.String }),
    }),
  })
);

const PULL_REQUEST_EVENTS: ReadonlySet<string> = new Set([
  "pull_request",
  "pull_request_target",
]);

/* On a pull request GITHUB_SHA names the merge commit, which no check can be
   shown against; the head the request was opened from is in the event file. */
const headShaOf = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const text = yield* fs.readFileString(path);
    const event = yield* Schema.decodeUnknown(PullRequestEvent)(text);

    return event.pull_request.head.sha;
  });

const shaOf = (
  eventName: Option.Option<string>,
  eventPath: Option.Option<string>,
  fallback: Option.Option<string>
): Effect.Effect<Option.Option<string>, never, FileSystem.FileSystem> => {
  const isPullRequest = Option.exists(eventName, (name) =>
    PULL_REQUEST_EVENTS.has(name)
  );

  if (!isPullRequest || Option.isNone(eventPath)) {
    return Effect.succeed(fallback);
  }

  return headShaOf(eventPath.value).pipe(
    Effect.map(Option.some),
    Effect.catchAll(() =>
      note(
        "Could not read the pull request head from the event file, so the check goes on GITHUB_SHA."
      ).pipe(Effect.as(fallback))
    )
  );
};

export const githubContext = Effect.gen(function* () {
  const token = yield* tokenConfig;
  const repository = yield* optionalString("GITHUB_REPOSITORY");

  if (Option.isNone(token) || Option.isNone(repository)) {
    return Option.none<GithubContext>();
  }

  const sha = yield* shaOf(
    yield* optionalString("GITHUB_EVENT_NAME"),
    yield* optionalString("GITHUB_EVENT_PATH"),
    yield* optionalString("GITHUB_SHA")
  );

  return Option.map(
    sha,
    (head): GithubContext => ({
      repository: repository.value,
      sha: head,
      token: token.value,
    })
  );
});
