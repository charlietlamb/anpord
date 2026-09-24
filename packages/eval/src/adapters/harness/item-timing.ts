import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import type { DecodedOutput } from "./session";

export type Pending = ReadonlyMap<string, number>;

export const noPending: Pending = new Map();

const withStart = (event: HarnessEvent, startedAt: number): HarnessEvent =>
  event._tag === "Command" || event._tag === "ToolCall"
    ? { ...event, startedAt }
    : event;

export const paired = (
  pending: Pending,
  decoded: DecodedOutput,
  at: number
): readonly [Pending, readonly HarnessEvent[]] => {
  const events = decoded.events ?? [];

  if (decoded.opens !== undefined) {
    return [new Map(pending).set(decoded.opens, at), events];
  }

  const startedAt =
    decoded.closes === undefined ? undefined : pending.get(decoded.closes);

  if (decoded.closes === undefined || startedAt === undefined) {
    return [pending, events];
  }

  const next = new Map(pending);
  next.delete(decoded.closes);

  return [next, events.map((event) => withStart(event, startedAt))];
};
