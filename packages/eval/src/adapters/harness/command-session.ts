import { Effect, Option, Ref, Stream } from "effect";
import type { HarnessEvent } from "../../domain/harness-event";
import { EMPTY_TALLY, tallied, totalOf } from "../../domain/usage-tally";
import type { HarnessSessionShape, RunHarness } from "../../ports/harness";
import { runCommandForOutcome } from "../sandbox/run-command";
import { decodeCommandLine, finishedOnExit } from "./command-events";
import { tracePath } from "./command-line";
import {
  type CommandEvent,
  traceToEvents,
  withoutReported,
} from "./command-recorder";
import { type HarnessOutput, harnessLines, shellQuote } from "./process";

const TRACE_TIMEOUT_MS = 60_000;

interface SessionState {
  readonly finished: Ref.Ref<boolean>;
  readonly reported: Ref.Ref<readonly HarnessEvent[]>;
  readonly started: Ref.Ref<boolean>;
  readonly usage: Ref.Ref<typeof EMPTY_TALLY>;
}

const journalled =
  (state: SessionState, request: RunHarness) => (output: HarnessOutput) =>
    Effect.gen(function* () {
      if (output._tag === "exit") {
        return Option.match(
          finishedOnExit(output, yield* Ref.get(state.finished)),
          { onNone: (): HarnessEvent[] => [], onSome: (event) => [event] }
        );
      }

      const decoded = decodeCommandLine(output.line, output.at);

      if (decoded.usage !== undefined) {
        const reported = decoded.usage;

        yield* Ref.update(state.usage, (tally) =>
          tallied(tally, reported, decoded.usageIsCumulative ?? false)
        );
      }

      const opening: HarnessEvent[] = [];

      if (decoded.sessionId !== undefined && !(yield* Ref.get(state.started))) {
        yield* Ref.set(state.started, true);
        opening.push({
          _tag: "Started",
          at: output.at,
          model: decoded.model ?? request.model,
          sessionId: decoded.sessionId,
        });
      }

      const events = [...opening, ...(decoded.events ?? [])];

      if (events.some((event) => event._tag === "Finished")) {
        yield* Ref.set(state.finished, true);
      }

      yield* Ref.update(state.reported, (seen) => [...seen, ...events]);

      return events;
    });

/**
 * The recorder's log, read once the process has ended.
 *
 * A command the process already printed is dropped rather than shown twice,
 * and a log that was never written reads as no commands: the trap is bash's,
 * so a process that never ran one leaves nothing behind.
 */
const traceFold = (
  request: RunHarness,
  reported: Ref.Ref<readonly HarnessEvent[]>
) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const outcome = yield* runCommandForOutcome(
        request.sandbox,
        `cat ${shellQuote(tracePath(request.sandbox.home))} 2>/dev/null || true`,
        { timeoutMs: TRACE_TIMEOUT_MS }
      ).pipe(Effect.orElseSucceed(() => null));

      if (outcome === null) {
        return Stream.empty;
      }

      const seen = yield* Ref.get(reported);

      return Stream.fromIterable<CommandEvent>(
        withoutReported(traceToEvents(outcome.stdout), seen)
      );
    })
  );

/** A command harness's stdout as a session: events, usage, and the shell
 * recorder's account of what actually ran. */
export const commandSession = (request: RunHarness, command: string) =>
  Effect.gen(function* () {
    const state: SessionState = {
      finished: yield* Ref.make(false),
      reported: yield* Ref.make<readonly HarnessEvent[]>([]),
      started: yield* Ref.make(false),
      usage: yield* Ref.make(EMPTY_TALLY),
    };

    const printed = harnessLines(
      request.harness,
      request.sandbox,
      command,
      request.env,
      { exit: "report" }
    ).pipe(Stream.mapConcatEffect(journalled(state, request)));

    return {
      /* Concatenated rather than merged: the fold reads a file the process is
         still appending to until it exits, and it drops what the process
         already reported, which is only known once it has. */
      events: printed.pipe(Stream.concat(traceFold(request, state.reported))),
      harness: request.harness,
      usage: Ref.get(state.usage).pipe(Effect.map(totalOf)),
      version: request.harnessVersion,
    } satisfies HarnessSessionShape;
  });
