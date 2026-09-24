import { useCallback, useSyncExternalStore } from "react";

const DISMISSED = "1";
const listeners = new Set<() => void>();

const readDismissed = (key: string) => {
  try {
    return window.localStorage.getItem(key) === DISMISSED;
  } catch {
    return false;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

export function useDismissed(key: string) {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed(key),
    () => false
  );

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(key, DISMISSED);
    } finally {
      for (const listener of listeners) {
        listener();
      }
    }
  }, [key]);

  return { dismiss, dismissed };
}
