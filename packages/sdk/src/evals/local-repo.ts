import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cloneUrlOf, parseRepo } from "@anpord/schema/domain/repo-spec";
import { Config, Effect, Option } from "effect";

const run = promisify(execFile);

const git = (args: readonly string[], cwd: string) =>
  Effect.tryPromise(() => run("git", [...args], { cwd })).pipe(
    Effect.map(({ stdout }) => stdout.trim()),
    Effect.orElseSucceed(() => "")
  );

const remoteUrl = (cwd: string) =>
  Effect.gen(function* () {
    const repository = yield* Config.string("GITHUB_REPOSITORY").pipe(
      Config.withDefault("")
    );
    const origin = yield* git(["remote", "get-url", "origin"], cwd);

    return origin === "" ? repository : origin;
  });

const fetchableRef = (cwd: string) =>
  Effect.gen(function* () {
    const ci = yield* Config.boolean("GITHUB_ACTIONS").pipe(
      Config.withDefault(false)
    );

    const [head, onRemote] = yield* Effect.all(
      [
        git(["rev-parse", "HEAD"], cwd),
        git(["branch", "--remotes", "--contains", "HEAD"], cwd),
      ],
      { concurrency: 2 }
    );

    if (ci && head === "") {
      return yield* Effect.fail(
        new Error(
          "Check out the commit before running evals in GitHub Actions."
        )
      );
    }
    return head === "" || (!ci && onRemote === "") ? null : head;
  });

export const localRepo = (cwd: string) =>
  Effect.gen(function* () {
    const [remote, ref] = yield* Effect.all(
      [remoteUrl(cwd), fetchableRef(cwd)],
      { concurrency: 2 }
    );

    const parsed = remote === "" ? null : parseRepo(remote);

    return parsed === null
      ? Option.none()
      : Option.some({ kind: "repo", ref, url: cloneUrlOf(parsed) } as const);
  }).pipe(Effect.withSpan("Eval.localRepo"));
