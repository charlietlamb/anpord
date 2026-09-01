import { relativeTime, shortAge } from "@anpord/ui/lib/relative-time";
import { useSyncExternalStore } from "react";

const NEVER_CHANGES = () => () => undefined;

/**
 * The server has no honest "now", so it renders nothing and the client fills it
 * in on mount. Reading the clock through the store keeps a render pure.
 */
export function useRelativeTime(value: Date) {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => relativeTime(value, new Date()),
    () => null
  );
}

/** The same moment, in a column's worth of characters. Reads the clock the
 * same way, so a list of rows agrees on when "now" was. */
export function useShortAge(value: Date) {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => shortAge(value, new Date()),
    () => null
  );
}
