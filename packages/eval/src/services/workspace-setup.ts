import type { EvalPrepare } from "@anpord/schema/domain/evals";
import { Effect } from "effect";
import { runCommandForOutcome } from "../adapters/sandbox/run-command";
import { PrepareFailed } from "../domain/errors";
import type { SandboxHandle } from "../ports/sandbox";

const MARKER = "ANPORD_PREPARE_RESULT=";
const SETUP_TIMEOUT_MS = 1_800_000;

const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const prepareValueOf = (output: string) => {
  const line = output.split("\n").findLast((entry) => entry.startsWith(MARKER));

  if (line === undefined) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(line.slice(MARKER.length));

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

      const outcome = yield* runCommandForOutcome(
        input.sandbox,
        `node ${quoted(path)}`,
        { cwd: input.workspace, timeoutMs: SETUP_TIMEOUT_MS }
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
    Effect.withSpan("Workspace.setup", {
      attributes: { prepare: input.prepare.name },
    })
  );
