import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import type { EvalPrepare } from "@anpord/schema/domain/evals";
import { Effect, Redacted } from "effect";
import { runCommand, runCommandOrFail } from "../adapters/sandbox/run-command";
import type { HarnessName } from "../domain/cell";
import type { HarnessUnavailable, SandboxUnavailable } from "../domain/errors";
import { type PrepareFailed, SourceUnavailable } from "../domain/errors";
import type { WorkspaceSource } from "../domain/workspace-source";
import type { HarnessDriverShape } from "../ports/harness";
import type { SandboxHandle } from "../ports/sandbox";
import { cloneFailureReason } from "./clone-failure";
import type { Suspender } from "./resumable-command";
import { runPrepare } from "./workspace-setup";

export interface PrepareWorkspace {
  /** What a restore should look under before the prepare runs. A prepare may
   * save under a narrower one of its own; this is what the runner can know
   * without having run it. */
  readonly cacheKey?: string;
  readonly credential: Redacted.Redacted<ResolvedCredential>;
  readonly driver: HarnessDriverShape;
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly home: string;
  readonly prepare: EvalPrepare | null;
  readonly sandbox: SandboxHandle;
  readonly source: WorkspaceSource;
  readonly sourceToken?: Redacted.Redacted<string> | undefined;
  readonly workspace: string;
}

const CLONE_TIMEOUT_MS = 300_000;

const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const CREDENTIAL_FILE = ".anpord-git-credentials";

const credentialFile = (
  input: PrepareWorkspace,
  url: string,
  token: Redacted.Redacted<string>
) => {
  const path = `${input.home}/${CREDENTIAL_FILE}`;

  return Effect.acquireRelease(
    input.sandbox
      .writeFile(
        path,
        `https://x-access-token:${Redacted.value(token)}@${new URL(url).host}\n`
      )
      .pipe(Effect.as(path)),
    () => Effect.ignore(runCommand(input.sandbox, `rm -f ${quoted(path)}`))
  );
};

const clone = (input: PrepareWorkspace, url: string, ref: string | null) => {
  const { sandbox, sourceToken, workspace } = input;

  const checkout =
    ref === null
      ? ""
      : ` && git -C ${quoted(workspace)} fetch --depth 1 origin ${quoted(ref)} && git -C ${quoted(workspace)} checkout --detach FETCH_HEAD`;

  const run = (helper: string) =>
    runCommandOrFail(
      sandbox,
      `git ${helper}clone --depth 1 ${quoted(url)} ${quoted(workspace)}${checkout}`,
      (outcome) =>
        new SourceUnavailable({
          reason: cloneFailureReason(
            url,
            ref,
            outcome.stderr,
            outcome.exitCode
          ),
          url,
        }),
      { timeoutMs: CLONE_TIMEOUT_MS }
    );

  if (sourceToken === undefined) {
    return run("");
  }

  return Effect.scoped(
    Effect.gen(function* () {
      const path = yield* credentialFile(input, url, sourceToken);

      return yield* run(
        `-c credential.helper=${quoted(`store --file=${path}`)} `
      );
    })
  );
};

const materialise = (input: PrepareWorkspace) => {
  const { source } = input;

  if (source.kind === "empty") {
    return Effect.void;
  }

  if (source.kind === "repo") {
    return clone(input, source.url, source.ref);
  }

  return Effect.forEach(
    Object.entries(source.files),
    ([path, content]) =>
      input.sandbox.writeFile(`${input.workspace}/${path}`, content),
    { discard: true }
  );
};

export const prepareWorkspace = (
  input: PrepareWorkspace
): Effect.Effect<
  {
    readonly env: Readonly<Record<string, string>>;
    readonly prepared: Readonly<Record<string, unknown>>;
  },
  HarnessUnavailable | SandboxUnavailable | PrepareFailed | SourceUnavailable,
  Suspender
> =>
  Effect.gen(function* () {
    const env = yield* input.driver.prepare({
      credential: input.credential,
      home: input.home,
      sandbox: input.sandbox,
      version: input.harnessVersion,
    });

    yield* runCommand(input.sandbox, `mkdir -p ${input.workspace}`, {
      timeoutMs: 60_000,
    });

    yield* materialise(input);

    const prepared =
      input.prepare === null
        ? {}
        : yield* runPrepare({
            cacheKey: input.cacheKey,
            sandbox: input.sandbox,
            prepare: input.prepare,
            workspace: input.workspace,
          });

    return { env, prepared };
  }).pipe(Effect.withSpan("Workspace.prepare"));
