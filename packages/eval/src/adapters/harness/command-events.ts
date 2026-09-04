import { Option, Schema } from "effect";
import { CommandLine, type CommandUsageLine } from "../../domain/command-line";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";
import type { HarnessExit } from "./process";
import type { DecodedOutput } from "./support";

const parseJson = Option.liftThrowable((line: string): unknown =>
  JSON.parse(line)
);

const decodeLine = Schema.decodeUnknownOption(CommandLine);

const usageOf = (line: CommandUsageLine): HarnessUsage => ({
  cacheReadTokens: line.cacheReadTokens ?? 0,
  cacheWriteTokens: line.cacheWriteTokens ?? 0,
  inputTokens: line.inputTokens,
  outputTokens: line.outputTokens,
  totalTokens: line.totalTokens ?? line.inputTokens + line.outputTokens,
});

const outputOf = (decoded: CommandLine, at: number): DecodedOutput => {
  if (decoded._tag === "Usage") {
    return { usage: usageOf(decoded), usageIsCumulative: false };
  }

  /* The session opens from these rather than from the event itself:
     returning both would start the session twice. */
  if (decoded._tag === "Started") {
    return { model: decoded.model, sessionId: decoded.sessionId };
  }

  return { events: [{ ...decoded, at: decoded.at ?? at }] };
};

/**
 * One stdout line from a customer's process.
 *
 * Anything that is not a JSON object with a known `_tag` is the process
 * talking to itself, and is ignored rather than failing the trial.
 */
export const decodeCommandLine = (line: string, at: number): DecodedOutput =>
  parseJson(line).pipe(
    Option.flatMap(decodeLine),
    Option.match({
      onNone: (): DecodedOutput => ({}),
      onSome: (decoded) => outputOf(decoded, at),
    })
  );

/**
 * The closing event for a process that never printed its own.
 *
 * Recorded as a reason rather than a failure: the verifier scores the trial,
 * and a journal that ends without `Finished` would look interrupted.
 */
export const finishedOnExit = (
  exit: HarnessExit,
  finishedSeen: boolean
): Option.Option<HarnessEvent> =>
  finishedSeen
    ? Option.none()
    : Option.some({
        _tag: "Finished",
        at: exit.at,
        reason: `exit ${exit.exitCode}`,
      });
