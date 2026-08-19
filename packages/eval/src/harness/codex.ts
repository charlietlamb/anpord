import { Effect, Layer, Option, Ref, Stream } from "effect";
import { HarnessUnavailable } from "../domain/errors";
import type { HarnessUsage } from "../domain/harness-event";
import {
  HarnessRunner,
  type HarnessSessionShape,
  type RunHarness,
} from "../ports/harness";
import { decodeCodexLine } from "./codex-events";
import { CODEX_BIN } from "./codex-install";

/** Codex reads the prompt from argv, so it is quoted rather than interpolated
 * raw: a task prompt is customer text and will eventually contain a quote. */
const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const command = (request: RunHarness) =>
  [
    `cd ${request.workspace}`,
    "&&",
    `${CODEX_BIN} exec --json --skip-git-repo-check`,
    "--dangerously-bypass-approvals-and-sandbox",
    quoted(request.prompt),
  ].join(" ");

/**
 * Runs Codex inside the sandbox and normalises its output.
 *
 * The exit code of each command the agent ran is read from the harness stream
 * here, but it is not what scores the trial. The verifier is run afterwards by
 * the scorer, from our own journal, because a harness reporting its own
 * success is the instrument this product exists to replace.
 */
export const CodexRunnerLive = Layer.succeed(
  HarnessRunner,
  HarnessRunner.of({
    run: (request: RunHarness) =>
      Effect.gen(function* () {
        const usage = yield* Ref.make(Option.none<HarnessUsage>());

        const events = request.sandbox
          .exec(command(request), {
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
            Stream.mapConcat((chunk) => chunk.data.split("\n")),
            Stream.mapEffect((line) => {
              const decoded = decodeCodexLine(line);

              return Option.isSome(decoded.usage)
                ? Ref.set(usage, decoded.usage).pipe(Effect.as(decoded.event))
                : Effect.succeed(decoded.event);
            }),
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
