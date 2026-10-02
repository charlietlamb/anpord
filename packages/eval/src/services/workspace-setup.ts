import type { EvalPrepare } from "@sphynx/schema/domain/eval-definition";
import { CACHE_RESTORED_ENV } from "@sphynx/schema/domain/sandbox-env";
import { redactSecrets } from "@sphynx/schema/domain/secret-text";
import { Effect, Either, Option, Ref } from "effect";
import { shellQuote } from "../adapters/harness/process";
import { runCommandForOutcome } from "../adapters/sandbox/run-command";
import { PrepareFailed } from "../domain/errors";
import {
  NOTHING_STREAMED,
  readPrepareValue,
  type StreamedOutput,
  shownPrepareOutput,
} from "../domain/prepare-output";
import type { SandboxHandle } from "../ports/sandbox";
import { runLongCommand } from "./long-command";

const SETUP_TIMEOUT_MS = 1_800_000;

const scriptIn = (sandbox: SandboxHandle, source: string) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const path = `${sandbox.home}/.sphynx-setup.mjs`;
      yield* sandbox.writeFile(path, source);

      return path;
    }),
    (path) =>
      Effect.ignore(runCommandForOutcome(sandbox, `rm -f ${shellQuote(path)}`))
  );

export const runPrepare = (input: {
  /* Declared on the case, not reported by the prepare, because a restore precedes it. */
  readonly caseCache?: { readonly key: string; readonly path: string };
  readonly forwarded?: Readonly<Record<string, string>>;
  readonly sandbox: SandboxHandle;
  readonly prepare: EvalPrepare;
  readonly secrets: readonly string[];
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

      const env = {
        ...(restored ? { [CACHE_RESTORED_ENV]: "1" } : {}),
        ...input.forwarded,
      };

      const carried = yield* Ref.make(NOTHING_STREAMED);
      const watch = (arrived: StreamedOutput) =>
        Ref.modify(carried, (held) =>
          shownPrepareOutput(held, arrived, input.secrets)
        ).pipe(
          Effect.flatMap((shown) =>
            shown === ""
              ? Effect.void
              : Effect.logInfo("preparing").pipe(
                  Effect.annotateLogs({
                    output: shown,
                    prepare: input.prepare.name,
                    untrusted: true,
                  })
                )
          )
        );

      const outcome = yield* runLongCommand(
        input.sandbox,
        `node ${shellQuote(path)}`,
        {
          cwd: input.workspace,
          env: Object.keys(env).length === 0 ? undefined : env,
          timeoutMs: SETUP_TIMEOUT_MS,
          watch,
        }
      );

      if (outcome.exitCode !== 0) {
        return yield* new PrepareFailed({
          name: input.prepare.name,
          reason: redactSecrets(
            outcome.stderr.trim() ||
              `The prepare step ${input.prepare.name} exited with status ${outcome.exitCode}`,
            input.secrets
          ),
        });
      }

      const reported = readPrepareValue(outcome.stdout);
      if (Either.isLeft(reported)) {
        return yield* new PrepareFailed({
          name: input.prepare.name,
          reason: reported.left,
        });
      }

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

      return reported.right;
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
