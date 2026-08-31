import type { EvalPrepare } from "@anpord/schema/domain/evals";
import { Effect } from "effect";
import { runCommandForOutcome } from "../adapters/sandbox/run-command";
import { PrepareFailed } from "../domain/errors";
import type { SandboxHandle } from "../ports/sandbox";
import { runResumable } from "./resumable-command";

const MARKER = "ANPORD_PREPARE_RESULT=";
const SETUP_TIMEOUT_MS = 1_800_000;
const PREPARED_LIMIT = 16_000;

const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

export const prepareValueOf = (output: string) => {
  const line = output.split("\n").findLast((entry) => entry.startsWith(MARKER));

  if (line === undefined) {
    return {};
  }

  const encoded = line.slice(MARKER.length);

  /* A prepare returns whatever it likes and every trial stores a copy, which
     is then served to any reader of the run. Bounded here so one script cannot
     put a log, a lockfile, or a base64 image through the database and into an
     API response. */
  if (encoded.length > PREPARED_LIMIT) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(encoded);

    return typeof parsed === "object" && parsed !== null
      ? (parsed as Readonly<Record<string, unknown>>)
      : {};
  } catch {
    return {};
  }
};

const scriptIn = (sandbox: SandboxHandle, source: string) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const path = `${sandbox.home}/.anpord-setup.mjs`;
      yield* sandbox.writeFile(path, source);

      return path;
    }),
    (path) =>
      Effect.ignore(runCommandForOutcome(sandbox, `rm -f ${quoted(path)}`))
  );

export const runPrepare = (input: {
  readonly sandbox: SandboxHandle;
  readonly prepare: EvalPrepare;
  readonly workspace: string;
}) =>
  Effect.scoped(
    Effect.gen(function* () {
      const path = yield* scriptIn(input.sandbox, input.prepare.source);

      const outcome = yield* runResumable(
        input.sandbox,
        `node ${quoted(path)}`,
        {
          cwd: input.workspace,
          env: input.sandbox.cache
            ? { ANPORD_CACHE_DIR: input.sandbox.cache }
            : undefined,
          timeoutMs: SETUP_TIMEOUT_MS,
        }
      );

      return outcome.exitCode === 0
        ? prepareValueOf(outcome.stdout)
        : yield* Effect.fail(
            new PrepareFailed({
              name: input.prepare.name,
              reason: outcome.stderr.trim() || `exit ${outcome.exitCode}`,
            })
          );
    })
  ).pipe(
    Effect.withSpan("Workspace.prepare", {
      attributes: {
        prepare: input.prepare.name,
        provider: input.sandbox.provider,
        sandboxId: input.sandbox.id,
      },
    }),
    Effect.annotateLogs({
      prepare: input.prepare.name,
      sandboxId: input.sandbox.id,
    })
  );
