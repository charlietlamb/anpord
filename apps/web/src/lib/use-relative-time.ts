import { useSyncExternalStore } from "react";
import { relativeTime } from "@/lib/relative-time";

const NEVER_CHANGES = () => () => undefined;

/**
 * The server has no honest "now", so it renders nothing and the client fills it
 * in on mount. Reading the clock through the store keeps a render pure.
 */
export function useRelativeTime(value: Date) {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => relativeTime(value, Date.now()),
    () => null
  );
}
