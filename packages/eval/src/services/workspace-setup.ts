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

  /* Every trial stores a copy and serves it to readers, so one script must not
     put a log or a base64 image through the database. */
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
  /* Declared on the case, not reported by the prepare, because a restore precedes it. */
  readonly caseCache?: { readonly key: string; readonly path: string };
  readonly sandbox: SandboxHandle;
  readonly prepare: EvalPrepare;
  readonly workspace: string;
}) =>
  Effect.scoped(
    Effect.gen(function* () {
      const path = yield* scriptIn(input.sandbox, input.prepare.source);

      const cache = input.sandbox.cache;

      /* Restored before the prepare and saved after, so a script never touches a
         store whose capabilities it cannot know. */
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
          /* The customer's own script talking, annotated untrusted: it may echo a
             key, and no length limit would redact that. */
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

      /* Only on success: caching what a failed install left behind outlives the
         run that made it. */
      if (Option.isSome(cache) && kept !== undefined && !restored) {
        /* A failed save costs the next run its cache only, so it must not fail
           this one, but silence hides a cache that never fills. */
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
