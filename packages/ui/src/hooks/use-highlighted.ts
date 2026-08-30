"use client";

import { type CodeLanguage, highlight } from "@anpord/ui/lib/highlight";
import { useEffect, useState } from "react";

/**
 * Source turned into coloured markup.
 *
 * A genuine synchronisation with something outside React -- a wasm engine
 * loaded on demand -- which is what an effect is for. Null until it lands,
 * so the caller can show the plain text meanwhile rather than an empty box:
 * the code is readable either way, and colour is the only thing waiting.
 */
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
        /* Uncoloured code is still code. A highlighter that cannot load is
           not worth failing the page over. */
      });

    return () => {
      alive = false;
    };
  }, [code, lang]);

  return html;
}
