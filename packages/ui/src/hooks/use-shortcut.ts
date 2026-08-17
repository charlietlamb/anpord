import { useEffect } from "react";

interface UseShortcutOptions {
  disabled?: boolean;
  meta?: boolean;
  onTrigger: () => void;
}

export function useShortcut(
  key: string,
  { meta = false, disabled = false, onTrigger }: UseShortcutOptions
) {
  useEffect(() => {
    if (disabled) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      const metaPressed = event.metaKey || event.ctrlKey;
      if (meta && !metaPressed) {
        return;
      }
      if (!meta && metaPressed) {
        return;
      }
      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onTrigger();
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [key, meta, disabled, onTrigger]);
}

export function isMac() {
  return (
    typeof navigator !== "undefined" && navigator.userAgent.includes("Mac")
  );
}
