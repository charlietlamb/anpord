import { isMac } from "@anpord/ui/hooks/use-shortcut";
import { useSyncExternalStore } from "react";

const NEVER_CHANGES = () => () => undefined;

/**
 * The server cannot know the platform, so it renders the same label the client
 * starts from; reading it through the store keeps hydration in step.
 */
export function useMetaKeyLabel() {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => (isMac() ? "⌘" : "Ctrl"),
    () => "Ctrl"
  );
}
