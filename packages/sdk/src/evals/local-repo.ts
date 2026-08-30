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

const environment = () => globalThis.process?.env ?? {};

const remoteUrl = (cwd: string) =>
  Effect.gen(function* () {
    const { GITHUB_REPOSITORY } = environment();
    const origin = yield* git(["remote", "get-url", "origin"], cwd);

    return origin === "" && GITHUB_REPOSITORY !== undefined
      ? GITHUB_REPOSITORY
      : origin;
  });

const fetchableRef = (cwd: string) =>
  Effect.gen(function* () {
    const { GITHUB_HEAD_REF } = environment();

    if (GITHUB_HEAD_REF !== undefined && GITHUB_HEAD_REF !== "") {
      return GITHUB_HEAD_REF;
    }

    const [head, onRemote] = yield* Effect.all(
      [
        git(["rev-parse", "HEAD"], cwd),
        git(["branch", "--remotes", "--contains", "HEAD"], cwd),
      ],
      { concurrency: 2 }
    );

    return head === "" || onRemote === "" ? null : head;
  });

export const localRepo = (
  cwd: string
): Effect.Effect<Option.Option<EvalSource>> =>
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
