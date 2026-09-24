"use client";

import { type CodeLanguage, highlight } from "@anpord/ui/lib/highlight";
import { useEffect, useState } from "react";

export function useHighlighted(code: string, lang: CodeLanguage) {
  const [result, setResult] = useState<{
    code: string;
    lang: CodeLanguage;
    html: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;

    highlight(code, lang)
      .then((next) => {
        if (alive) {
          setResult({ code, lang, html: next });
        }
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [code, lang]);

  return result?.code === code && result.lang === lang ? result.html : null;
}
