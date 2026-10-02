import {
  EVIDENCE_LIMITS,
  type EvalValidation,
  type ValidationValue,
  validationSnapshot,
} from "@sphynx/schema/domain/eval-validations";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import { redactSecrets } from "@sphynx/schema/domain/secret-text";

const MESSAGE_LIMIT = 2000;

const redactedWithin = (known: readonly string[]) => {
  let remaining = EVIDENCE_LIMITS.budget;

  return (value: ValidationValue): ValidationValue => {
    if (value.state !== "captured") {
      return value;
    }
    const redacted = redactSecrets(value.text, known);
    const text = redacted.slice(0, Math.min(remaining, EVIDENCE_LIMITS.text));
    remaining -= text.length;

    return {
      ...value,
      text,
      truncated: value.truncated || text.length < redacted.length,
    };
  };
};

export const redactValidation = (
  record: EvalValidation,
  known: readonly string[] = []
): EvalValidation => {
  const value = redactedWithin(known);
  const text = (field: string) => redactSecrets(field, known);
  const input = value(record.input);
  const calls = record.calls.map((call) => ({
    ...call,
    input: value(call.input),
    output: value(call.output),
    error: call.error === null ? null : value(call.error),
  }));
  const logs = record.logs.map((log) => ({ ...log, value: value(log.value) }));
  const output = value(record.output);
  const error = record.error === null ? null : value(record.error);

  return validationSnapshot({
    ...record,
    message: text(record.message).slice(0, MESSAGE_LIMIT),
    input,
    output,
    error,
    ...(record.metadata === undefined
      ? {}
      : { metadata: value(record.metadata) }),
    ...(record.judgment === undefined
      ? {}
      : {
          judgment: {
            ...record.judgment,
            reason: text(record.judgment.reason),
            error:
              record.judgment.error === null
                ? null
                : text(record.judgment.error),
          },
        }),
    calls,
    logs,
  });
};

export const redactEvent = (
  event: HarnessEvent,
  known: readonly string[] = []
): HarnessEvent => {
  const text = (field: string) => redactSecrets(field, known);

  switch (event._tag) {
    case "Message":
      return { ...event, text: text(event.text) };
    case "Command":
      return {
        ...event,
        command: text(event.command),
        output: text(event.output),
      };
    case "ToolCall":
      return {
        ...event,
        input: text(event.input),
        ...(event.output === undefined ? {} : { output: text(event.output) }),
        ...(event.error === undefined ? {} : { error: text(event.error) }),
      };
    case "FileChange":
      return { ...event, paths: event.paths.map(text) };
    case "Finished":
      return { ...event, reason: text(event.reason) };
    default:
      return event;
  }
};
