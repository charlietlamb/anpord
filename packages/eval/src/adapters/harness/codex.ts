import { Effect, Layer, Option, Ref, Stream } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { HarnessUsage } from "../../domain/harness-event";
import {
  HarnessRunner,
  type HarnessSessionShape,
  type RunHarness,
} from "../../ports/harness";
import { decodeCodexLine } from "./codex-events";
import { CODEX_BIN } from "./codex-install";
import { noPending, timeLine } from "./codex-timing";

/** Codex reads the prompt from argv, so it is quoted rather than interpolated
 * raw: a task prompt is customer text and will eventually contain a quote. */
const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

/**
 * The line Codex is run with.
 *
 * No `--model`, deliberately. Codex here authenticates as a ChatGPT account,
 * and that path refuses every model passed explicitly -- `gpt-5-codex`,
 * `gpt-5`, `codex-mini-latest` and `o3` each return
 * `400 ... not supported when using Codex with a ChatGPT account`, including
 * the model Codex itself picks when the flag is absent. Sending the column's
 * model would fail every trial rather than compare anything.
 *
 * The cell key still hashes the model, so a grid can record which one a
 * column meant. Making that true rather than aspirational needs an API-key
 * credential, not a change here.
 */
export const codexCommand = (request: RunHarness) =>
  [
    `cd ${request.workspace}`,
    "&&",
    `${CODEX_BIN} exec --json --skip-git-repo-check`,
    "--dangerously-bypass-approvals-and-sandbox",
    quoted(request.prompt),
    /* Closed, because Codex prints "Reading additional input from stdin..."
       and blocks forever when it has a terminal it can read. A local shell
       gives it nothing and it proceeds; a sandbox session hands it one, and
       the run hangs until the trial times out having produced no journal. */
    "< /dev/null",
  ].join(" ");

/** Runs Codex inside the sandbox and normalises its output. */
export const CodexRunnerLive = Layer.succeed(
  HarnessRunner,
  HarnessRunner.of({
    run: (request: RunHarness) =>
      Effect.gen(function* () {
        const usage = yield* Ref.make(Option.none<HarnessUsage>());
        /* Commands seen to begin and not yet finished. Held here rather than
           inside the decoder so that stays a pure function of one line. */
        const pending = yield* Ref.make(noPending);

        const events = request.sandbox
          .exec(codexCommand(request), {
            timeoutMs: 15 * 60 * 1000,
          })
          .pipe(
            Stream.mapError(
              (cause) =>
                new HarnessUnavailable({
                  harness: "codex",
                  reason: cause.reason,
                })
            ),
            Stream.filter((chunk) => chunk.stream === "stdout"),
            /* The chunk's own moment travels with each line it holds. Reading
               a clock here instead would measure when this code got round to
               the line rather than when the sandbox produced it, which is the
               difference between a real duration and zero. */
            Stream.mapConcat((chunk) =>
              chunk.data.split("\n").map((line) => ({ at: chunk.at, line }))
            ),
            Stream.mapEffect(({ at, line }) =>
              Effect.gen(function* () {
                const decoded = decodeCodexLine(line);

                if (Option.isSome(decoded.usage)) {
                  yield* Ref.set(usage, decoded.usage);
                }

                const timed = timeLine(decoded, at, yield* Ref.get(pending));

                yield* Ref.set(pending, timed.pending);

                return timed.event;
              })
            ),
            Stream.filterMap((event) => event)
          );

        return {
          events,
          harness: "codex",
          usage: Ref.get(usage),
          version: request.harnessVersion,
        } satisfies HarnessSessionShape;
      }).pipe(Effect.withSpan("CodexRunner.run")),
  })
);
