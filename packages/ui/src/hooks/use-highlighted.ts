"use client";

import { type CodeLanguage, highlight } from "@anpord/ui/lib/highlight";
import { useEffect, useState } from "react";

/** Null until the wasm highlighter loads, so callers show plain text. */
export function useHighlighted(code: string, lang: CodeLanguage) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    highlight(code, lang)
      .then((next) => {
        if (alive) {
          setHtml(next);
        }
      })
      .catch(() => {
        /* Uncoloured code is still code. */
      });

    return () => {
      alive = false;
    };
  }, [code, lang]);

  return html;
}
