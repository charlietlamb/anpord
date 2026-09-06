import { isMac } from "@anpord/ui/hooks/use-shortcut";
import { useSyncExternalStore } from "react";

const NEVER_CHANGES = () => () => undefined;

/* The server cannot know the platform, so the store keeps hydration in step. */
export function useMetaKeyLabel() {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => (isMac() ? "⌘" : "Ctrl"),
    () => "Ctrl"
  );
}
