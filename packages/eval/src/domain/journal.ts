import type { HarnessEvent } from "../domain/harness-event";

/**
 * What a journal of harness events says about a run.
 *
 * Calculations over a list, not a service: no I/O to reach for and no
 * production-versus-test variation, so a test needs no layer.
 */
export const commandsIn = (events: readonly HarnessEvent[]) =>
  events.filter((event) => event._tag === "Command").length;

export const filesIn = (events: readonly HarnessEvent[]) => [
  ...new Set(
    events.flatMap((event) => (event._tag === "FileChange" ? event.paths : []))
  ),
];

/** Commands the agent itself saw fail. Worth separating from the verdict: an
 * agent that failed four commands and still passed worked differently from one
 * that passed first time, and only this distinguishes them. */
export const failedCommandsIn = (events: readonly HarnessEvent[]) =>
  events.filter(
    (event) =>
      event._tag === "Command" &&
      event.exitCode !== null &&
      event.exitCode !== 0
  ).length;

export const sessionIdOf = (events: readonly HarnessEvent[]) => {
  const started = events.find((event) => event._tag === "Started");

  return started === undefined ? null : started.sessionId;
};
