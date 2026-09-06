import type { HarnessEvent } from "../domain/harness-event";

export const commandsIn = (events: readonly HarnessEvent[]) =>
  events.filter((event) => event._tag === "Command").length;

export const filesIn = (events: readonly HarnessEvent[]) => [
  ...new Set(
    events.flatMap((event) => (event._tag === "FileChange" ? event.paths : []))
  ),
];

export const failedCommandsIn = (events: readonly HarnessEvent[]) =>
  events.filter(
    (event) =>
      event._tag === "Command" &&
      event.exitCode !== null &&
      event.exitCode !== 0
  ).length;

export const toolCallsIn = (events: readonly HarnessEvent[]) =>
  events.flatMap((event) => (event._tag === "ToolCall" ? [event.name] : []));

export const calledAll = (
  events: readonly HarnessEvent[],
  required: readonly string[]
) => {
  const called = new Set(toolCallsIn(events));

  return required.every((name) => called.has(name));
};

export const calledAny = (
  events: readonly HarnessEvent[],
  forbidden: readonly string[]
) => {
  const called = new Set(toolCallsIn(events));

  return forbidden.filter((name) => called.has(name));
};

export const lastToolCallIn = (events: readonly HarnessEvent[]) =>
  toolCallsIn(events).at(-1) ?? null;

const assistantMessagesIn = (events: readonly HarnessEvent[]) =>
  events.flatMap((event) =>
    event._tag === "Message" && event.role === "assistant" ? [event.text] : []
  );

export const answerOf = (events: readonly HarnessEvent[]) =>
  assistantMessagesIn(events).at(-1) ?? "";

export const transcriptOf = (events: readonly HarnessEvent[]) =>
  assistantMessagesIn(events).join("\n\n");

export const sessionIdOf = (events: readonly HarnessEvent[]) => {
  const started = events.find((event) => event._tag === "Started");

  return started === undefined ? null : started.sessionId;
};
