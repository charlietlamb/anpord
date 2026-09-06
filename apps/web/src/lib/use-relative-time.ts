import { relativeTime, shortAge } from "@anpord/ui/lib/relative-time";
import { useSyncExternalStore } from "react";

const NEVER_CHANGES = () => () => undefined;

/* The server has no honest "now", so it renders null and the client fills it in on mount. */
export function useRelativeTime(value: Date) {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => relativeTime(value, new Date()),
    () => null
  );
}

export function useShortAge(value: Date) {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => shortAge(value, new Date()),
    () => null
  );
}
