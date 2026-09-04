import type { HarnessEvent } from "../domain/harness-event";

/** What a journal of harness events says about a run. */
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

/** Tools the agent invoked, in order, by name. */
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

/** Assistant messages in order, oldest first. */
const assistantMessagesIn = (events: readonly HarnessEvent[]) =>
  events.flatMap((event) =>
    event._tag === "Message" && event.role === "assistant" ? [event.text] : []
  );

/** What the agent finally said, which is the whole answer for a case that
 * asserts over the reply rather than over the files it wrote. Empty when it
 * said nothing, so a reader never has to tell absence from silence. */
export const answerOf = (events: readonly HarnessEvent[]) =>
  assistantMessagesIn(events).at(-1) ?? "";

/** Every assistant message, newest last, separated by a blank line. Kept apart
 * from the answer because an agent that worked aloud and then summarised says
 * different things in the two, and a case may assert on either. */
export const transcriptOf = (events: readonly HarnessEvent[]) =>
  assistantMessagesIn(events).join("\n\n");

export const sessionIdOf = (events: readonly HarnessEvent[]) => {
  const started = events.find((event) => event._tag === "Started");

  return started === undefined ? null : started.sessionId;
};
