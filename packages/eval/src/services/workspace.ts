import { Effect, type Redacted, Stream } from "effect";
import {
  authenticateCodex,
  installCodex,
} from "../adapters/harness/codex-install";
import type { HarnessUnavailable, SandboxUnavailable } from "../domain/errors";
import type { WorkspaceSource } from "../domain/workspace-source";
import type { SandboxHandle } from "../ports/sandbox";

export interface PrepareWorkspace {
  readonly credentials: Redacted.Redacted<string>;
  readonly harnessVersion: string;
  readonly home: string;
  readonly sandbox: SandboxHandle;
  readonly setupCommand: string | null;
  readonly source: WorkspaceSource;
  readonly workspace: string;
}

/** Quoted rather than interpolated raw: a repository url is customer text and
 * a ref is whatever they typed. */
const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const clone = (input: PrepareWorkspace, url: string, ref: string | null) => {
  const checkout = ref === null ? "" : ` && git checkout ${quoted(ref)}`;

  /* Shallow by default, because an eval needs the tree at one commit and not
     the history that led to it. A failure here is the provider's, not the
     agent's, so it stays in the error channel rather than becoming a score. */
  return Stream.runDrain(
    input.sandbox.exec(
      `git clone --depth 1 ${quoted(url)} ${input.workspace}${checkout}`,
      { timeoutMs: 300_000 }
    )
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

/** Everything that has to be true before an agent starts, in the order it
 * has to be true in. */
export const prepareWorkspace = (
  input: PrepareWorkspace
): Effect.Effect<void, HarnessUnavailable | SandboxUnavailable> =>
  Effect.gen(function* () {
    yield* installCodex(input.sandbox, input.harnessVersion);
    yield* authenticateCodex(input.sandbox, input.credentials, input.home);

    yield* Stream.runDrain(
      input.sandbox.exec(`mkdir -p ${input.workspace}`, { timeoutMs: 60_000 })
    );

    yield* materialise(input);

    if (input.setupCommand !== null) {
      yield* Stream.runDrain(
        input.sandbox.exec(input.setupCommand, { timeoutMs: 300_000 })
      );
    }
  }).pipe(Effect.withSpan("Workspace.prepare"));
