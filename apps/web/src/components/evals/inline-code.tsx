import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * A span of code inside a line of text.
 *
 * Padded and tinted rather than only set in mono, because in a sentence the
 * face alone is not enough to say where the code starts. `box-decoration-clone`
 * keeps the tint and radius on both halves when a long path wraps.
 */
export function InlineCode({
  children,
  className,
  title,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly title?: string;
}) {
  return (
    <code
      className={cn(
        "break-words rounded-[4px] bg-foreground/[0.07] box-decoration-clone px-1 py-px font-mono text-[0.92em] text-foreground",
        className
      )}
      title={title}
    >
      {children}
    </code>
  );
}

const TICKED = /`([^`\n]+)`/g;

/**
 * Prose with its backticks honoured.
 *
 * A prompt is written in markdown's habit of ticking file names and keys,
 * and read raw the ticks are noise around the very words that matter.
 */
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
