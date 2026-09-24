import { useShortcut } from "@anpord/ui/hooks/use-shortcut";
import { useRef } from "react";

export function useShortcutClick<Element extends HTMLElement>(
  shortcut: string | undefined,
  { disabled = false, meta = false }: { disabled?: boolean; meta?: boolean }
) {
  const ref = useRef<Element>(null);

  useShortcut(shortcut ?? "", {
    disabled: disabled || !shortcut,
    meta,
    onTrigger: () => ref.current?.click(),
  });

  return ref;
}
