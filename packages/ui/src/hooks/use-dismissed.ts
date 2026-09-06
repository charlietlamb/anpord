"use client";

import { useCallback, useEffect, useState } from "react";

/* Starts false so server and first client render agree; storage access is
   guarded because a private window or blocked site data throws. */
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
