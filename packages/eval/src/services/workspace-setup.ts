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

interface PrepareReport {
  readonly cache: { readonly key: string; readonly path: string } | null;
  readonly value: Readonly<Record<string, unknown>>;
}

const EMPTY: PrepareReport = { cache: null, value: {} };

const namedCache = (found: unknown) => {
  const cache = (found as { cache?: unknown }).cache;

  if (typeof cache !== "object" || cache === null) {
    return null;
  }

  const { key, path } = cache as { key?: unknown; path?: unknown };

  /* A path is joined onto the workspace before it is archived, so one that
     climbs out of it would have the runner save somewhere else entirely. */
  return typeof key === "string" &&
    typeof path === "string" &&
    key !== "" &&
    path !== "" &&
    !path.startsWith("/") &&
    !path.split("/").includes("..")
    ? { key, path }
    : null;
};

export const prepareValueOf = (output: string): PrepareReport => {
  const line = output.split("\n").findLast((entry) => entry.startsWith(MARKER));

  if (line === undefined) {
    return EMPTY;
  }

  const encoded = line.slice(MARKER.length);

  /* A prepare returns whatever it likes and every trial stores a copy, which
     is then served to any reader of the run. Bounded here so one script cannot
     put a log, a lockfile, or a base64 image through the database and into an
     API response. */
  if (encoded.length > PREPARED_LIMIT) {
    return EMPTY;
  }

  try {
    const parsed: unknown = JSON.parse(encoded);

    if (typeof parsed !== "object" || parsed === null) {
      return EMPTY;
    }

    const value = (parsed as { value?: unknown }).value;

    return {
      cache: namedCache(parsed),
      value:
        typeof value === "object" && value !== null
          ? (value as Readonly<Record<string, unknown>>)
          : {},
    };
  } catch {
    return EMPTY;
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
  /** Where a restore should land, when the case named one. */
  readonly cacheKey?: string;
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
      const restored =
        cache === null || input.cacheKey === undefined
          ? false
          : yield* cache.restore(input.cacheKey, input.workspace);

      const outcome = yield* runResumable(
        input.sandbox,
        `node ${quoted(path)}`,
        {
          cwd: input.workspace,
          env: restored ? { ANPORD_CACHE_RESTORED: "1" } : undefined,
          timeoutMs: SETUP_TIMEOUT_MS,
          /* A prepare can run for half an hour and said nothing until it
             finished, which is how a failing install read as a hang. */
          watch: (text) =>
            Effect.logInfo("preparing").pipe(
              Effect.annotateLogs({ output: text, prepare: input.prepare.name })
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

      /* Only after a prepare succeeded. Caching what a failed install left
         behind is how a broken cache outlives the run that made it. */
      if (cache !== null && reported.cache !== null) {
        yield* cache
          .save(reported.cache.key, `${input.workspace}/${reported.cache.path}`)
          .pipe(Effect.ignoreLogged);
      }

      return reported.value;
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
