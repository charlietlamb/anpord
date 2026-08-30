import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { EvalSource } from "@anpord/schema/domain/evals";
import { cloneUrlOf, parseRepo } from "@anpord/schema/domain/repo-spec";
import { Effect, Option } from "effect";

const run = promisify(execFile);

const git = (args: readonly string[], cwd: string) =>
  Effect.tryPromise(() => run("git", [...args], { cwd })).pipe(
    Effect.map(({ stdout }) => stdout.trim()),
    Effect.orElseSucceed(() => "")
  );

export const localRepo = (
  cwd: string
): Effect.Effect<Option.Option<EvalSource>> =>
  Effect.gen(function* () {
    const [remote, head, onRemote] = yield* Effect.all(
      [
        git(["remote", "get-url", "origin"], cwd),
        git(["rev-parse", "HEAD"], cwd),
        git(["branch", "--remotes", "--contains", "HEAD"], cwd),
      ],
      { concurrency: 3 }
    );

    const parsed = remote === "" ? null : parseRepo(remote);

    return parsed === null
      ? Option.none()
      : Option.some({
          kind: "repo",
          ref: head === "" || onRemote === "" ? null : head,
          url: cloneUrlOf(parsed),
        } as const);
  }).pipe(Effect.withSpan("Eval.localRepo"));
