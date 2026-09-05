import type { EvalPrepare } from "@anpord/schema/domain/evals";
import { Effect, Option } from "effect";
import { runCommandForOutcome } from "../adapters/sandbox/run-command";
import { PrepareFailed } from "../domain/errors";
import type { SandboxHandle } from "../ports/sandbox";
import { runLongCommand } from "./long-command";

const MARKER = "ANPORD_PREPARE_RESULT=";
const SETUP_TIMEOUT_MS = 1_800_000;
const PREPARED_LIMIT = 16_000;

const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

export const prepareValueOf = (
  output: string
): Readonly<Record<string, unknown>> => {
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
  /** What this case keeps between runs. Declared on the case rather than
   * reported by the prepare, because a restore precedes it. */
  readonly caseCache?: { readonly key: string; readonly path: string };
  readonly sandbox: SandboxHandle;
  readonly prepare: EvalPrepare;
  readonly workspace: string;
}) =>
  Effect.scoped(
    Effect.gen(function* () {
      const path = yield* scriptIn(input.sandbox, input.prepare.source);

      const cache = input.sandbox.cache;

      /* Restored before the prepare runs and saved after, so a prepare names
         what is worth keeping and never touches the store: providers differ in
         what theirs can do, and a script cannot know which it is on. */
      const kept = input.caseCache;

      const restored =
        Option.isNone(cache) || kept === undefined
          ? false
          : yield* cache.value.restore(
              kept.key,
              `${input.workspace}/${kept.path}`
            );

      if (kept !== undefined) {
        yield* Effect.logInfo(
          restored ? "restored what an earlier run kept" : "nothing kept yet"
        ).pipe(
          Effect.annotateLogs({
            key: kept.key,
            mounted: Option.isSome(cache),
          })
        );
      }

      const outcome = yield* runLongCommand(
        input.sandbox,
        `node ${quoted(path)}`,
        {
          cwd: input.workspace,
          env: restored ? { ANPORD_CACHE_RESTORED: "1" } : undefined,
          timeoutMs: SETUP_TIMEOUT_MS,
          /* A prepare can run for half an hour and said nothing until it
             finished, which is how a failing install read as a hang.

             The output is the customer's own script talking, so it is
             annotated as untrusted rather than trimmed: a script that echoes
             its environment puts a key here, and no length limit would redact
             that. A log sink is what must treat this as third-party text. */
          watch: (text) =>
            Effect.logInfo("preparing").pipe(
              Effect.annotateLogs({
                output: text,
                prepare: input.prepare.name,
                untrusted: true,
              })
            ),
        }
      );

      if (outcome.exitCode !== 0) {
        return yield* Effect.fail(
          new PrepareFailed({
            name: input.prepare.name,
            reason: outcome.stderr.trim() || `exit ${outcome.exitCode}`,
          })
        );
      }

      const reported = prepareValueOf(outcome.stdout);

      /* Under the key a restore will look for, which is why the case declares
         it: something the prepare returned could name only what a later run
         has no way to ask for.

         Only after it succeeded, because caching what a failed install left
         behind is how a broken cache outlives the run that made it. */
      if (Option.isSome(cache) && kept !== undefined && !restored) {
        /* Warned rather than ignored: a save that fails costs the next run its
           cache and nothing else, so it must not fail this one -- but silence
           made a cache that never filled indistinguishable from one nobody
           asked for. */
        yield* cache.value
          .save(kept.key, `${input.workspace}/${kept.path}`)
          .pipe(
            Effect.tapError((cause) =>
              Effect.logWarning("could not keep what the prepare built").pipe(
                Effect.annotateLogs({ key: kept.key, reason: cause.reason })
              )
            ),
            Effect.ignore
          );
      }

      return reported;
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
