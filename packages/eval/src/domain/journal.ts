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

/**
 * Tools the agent invoked, in order, by name.
 *
 * The three questions every customer in the research asks of a trajectory are
 * "did it call this", "did it avoid that", and "what did it end on", and all
 * three are answered from this list. PostHog, Onyx and DeerFlow each wrote
 * their own version of it over their own harness's log format.
 */
export const toolCallsIn = (events: readonly HarnessEvent[]) =>
  events.flatMap((event) => (event._tag === "ToolCall" ? [event.name] : []));

/** Whether every named tool was called at least once. */
export const calledAll = (
  events: readonly HarnessEvent[],
  required: readonly string[]
) => {
  const called = new Set(toolCallsIn(events));

  return required.every((name) => called.has(name));
};

/** Which of the named tools were called. Returns the offenders rather than a
 * boolean, because a scorer that says only "forbidden tool used" leaves
 * somebody grepping a journal to find out which. */
export const calledAny = (
  events: readonly HarnessEvent[],
  forbidden: readonly string[]
) => {
  const called = new Set(toolCallsIn(events));

  return forbidden.filter((name) => called.has(name));
};

/** The last tool invoked, which is how a customer asks whether an agent
 * finished by reporting rather than by still working. */
export const lastToolCallIn = (events: readonly HarnessEvent[]) =>
  toolCallsIn(events).at(-1) ?? null;

export const sessionIdOf = (events: readonly HarnessEvent[]) => {
  const started = events.find((event) => event._tag === "Started");

  return started === undefined ? null : started.sessionId;
};
