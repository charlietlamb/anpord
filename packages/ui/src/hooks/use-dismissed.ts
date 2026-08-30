"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Whether the reader has put something away, remembered on this device.
 *
 * Starts false on every render, including the server's, so the markup the
 * server sends and the browser's first pass agree; the stored answer arrives
 * a moment later. A thing that flashes away is better than one that appears
 * from nowhere, and there is nothing to show if it was never dismissed.
 *
 * Every access is guarded: a private window, cleared site data or a browser
 * set to block storage all throw rather than return null, and none of that
 * is worth failing a page over.
 */
export function useDismissed(key: string) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(key) === "1");
    } catch {
      /* Storage is unavailable, so nothing was ever put away. */
    }
  }, [key]);

  const dismiss = useCallback(() => {
    setDismissed(true);

    try {
      window.localStorage.setItem(key, "1");
    } catch {
      /* It stays dismissed for this visit, which is the useful half. */
    }
  }, [key]);

  return { dismiss, dismissed };
}
