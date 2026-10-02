import { relativeTime, shortAge } from "@sphynx/ui/lib/relative-time";
import { useSyncExternalStore } from "react";

const NEVER_CHANGES = () => () => undefined;

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
