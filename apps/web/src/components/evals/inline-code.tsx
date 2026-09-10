import { InlineCode } from "@anpord/ui/components/ui/inline-code";
import type { ReactNode } from "react";

const TICKED = /`([^`\n]+)`/g;

/* A prompt is plain text that happens to use backticks, not markdown: running
   it through a parser would also turn its hashes into headings and its
   asterisks into emphasis. This lifts the one convention it does use. */
export function TickedProse({ text }: { readonly text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(TICKED)) {
    const start = match.index ?? 0;

    if (start > last) {
      parts.push(text.slice(last, start));
    }

    parts.push(<InlineCode key={start}>{match[1]}</InlineCode>);
    last = start + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts;
}
