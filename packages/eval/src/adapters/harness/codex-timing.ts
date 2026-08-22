import { Option } from "effect";
import type { HarnessEvent } from "../../domain/harness-event";
import type { DecodedLine } from "./codex-events";

/** Commands begun and not yet finished, keyed by the id the harness gave them. */
export type Pending = ReadonlyMap<string, number>;

export const noPending: Pending = new Map();

export interface Timed {
  readonly event: Option.Option<HarnessEvent>;
  readonly pending: Pending;
}

const withStart = (event: HarnessEvent, startedAt: number): HarnessEvent =>
  event._tag === "Command" ? { ...event, startedAt } : event;

/**
 * Stamps a decoded line, pairing a command completion with its start.
 *
 * Pure and total, so pairing is testable without a sandbox or a clock. A
 * started line records the moment and emits nothing: the journal keeps one
 * entry per command carrying both ends. A completion whose start was never
 * seen emits without one, because absent means unknown.
 */
export const timeLine = (
  decoded: DecodedLine,
  at: number,
  pending: Pending
): Timed => {
  if (decoded.started) {
    if (Option.isNone(decoded.commandId)) {
      return { event: Option.none(), pending };
    }

    return {
      event: Option.none(),
      pending: new Map(pending).set(decoded.commandId.value, at),
    };
  }

  if (Option.isNone(decoded.event)) {
    return { event: Option.none(), pending };
  }

  const stamped: HarnessEvent = { ...decoded.event.value, at };

  if (Option.isNone(decoded.commandId)) {
    return { event: Option.some(stamped), pending };
  }

  const id = decoded.commandId.value;
  const startedAt = pending.get(id);

  if (startedAt === undefined) {
    return { event: Option.some(stamped), pending };
  }

  const next = new Map(pending);
  next.delete(id);

  return { event: Option.some(withStart(stamped, startedAt)), pending: next };
};
