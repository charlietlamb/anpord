import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Effect, type Redacted } from "effect";
import { runCommand, runCommandOrFail } from "../adapters/sandbox/run-command";
import type { HarnessName } from "../domain/cell";
import type { HarnessUnavailable, SandboxUnavailable } from "../domain/errors";
import { SourceUnavailable } from "../domain/errors";
import type { WorkspaceSource } from "../domain/workspace-source";
import type { HarnessDriverShape } from "../ports/harness";
import type { SandboxHandle } from "../ports/sandbox";
import { cloneFailureReason } from "./clone-failure";

export interface PrepareWorkspace {
  readonly credential: Redacted.Redacted<ResolvedCredential>;
  readonly driver: HarnessDriverShape;
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly home: string;
  readonly sandbox: SandboxHandle;
  readonly setupCommand: string | null;
  readonly source: WorkspaceSource;
  readonly workspace: string;
}

const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const clone = (input: PrepareWorkspace, url: string, ref: string | null) => {
  const checkout =
    ref === null
      ? ""
      : ` && git -C ${quoted(input.workspace)} fetch --depth 1 origin ${quoted(ref)} && git -C ${quoted(input.workspace)} checkout --detach FETCH_HEAD`;

  return runCommandOrFail(
    input.sandbox,
    `git clone --depth 1 ${quoted(url)} ${quoted(input.workspace)}${checkout}`,
    (outcome) =>
      new SourceUnavailable({
        reason: cloneFailureReason(url, ref, outcome.stderr, outcome.exitCode),
        url,
      }),
    { timeoutMs: 300_000 }
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
  Readonly<Record<string, string>>,
  HarnessUnavailable | SandboxUnavailable | SourceUnavailable
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

    if (input.setupCommand !== null) {
      yield* runCommand(input.sandbox, input.setupCommand, {
        cwd: input.workspace,
        timeoutMs: 300_000,
      });
    }

    return env;
  }).pipe(Effect.withSpan("Workspace.prepare"));
