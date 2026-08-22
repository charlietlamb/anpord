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
 * The model is passed, which is what makes a column mean what its header
 * says: without it every cell of a grid ran whatever Codex defaults to, and a
 * comparison of two models was one model run twice.
 *
 * A name the account cannot serve fails the trial with a 400 rather than
 * quietly running something else, which is the behaviour to want: a wrong
 * model is a wrong reading, and a reading that never happened is easier to
 * see than one taken against the wrong thing.
 */
export const codexCommand = (request: RunHarness) =>
  [
    `cd ${request.workspace}`,
    "&&",
    `${CODEX_BIN} exec --json --skip-git-repo-check`,
    "--dangerously-bypass-approvals-and-sandbox",
    /* Quoted like the prompt: a model reaches this from a form, and a shell
       cannot tell a model name from the rest of a command line. */
    `--model ${quoted(request.model)}`,
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
