import { isMac } from "@anpord/ui/hooks/use-shortcut";
import { useSyncExternalStore } from "react";

const NEVER_CHANGES = () => () => undefined;

export function useMetaKeyLabel() {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => (isMac() ? "⌘" : "Ctrl"),
    () => "Ctrl"
  );
}
