import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * A word of code inside a sentence.
 *
 * One component because four surfaces had each written their own: a tint, a
 * tint with a border, and two different sizes, so the same identifier looked
 * like a different kind of thing depending on which screen showed it.
 *
 * No border. A rule around a few characters mid-sentence reads as a boundary
 * the reader has to cross; a tint is enough to say "this is literal".
 *
 * `box-decoration-clone` keeps the tint and radius on both halves when a long
 * path wraps, rather than leaving the second line unpainted.
 *
 * Mono faces render smaller than the surrounding text at the same nominal
 * size, so `0.92em` is what makes them look equal rather than shrunken.
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
        "box-decoration-clone break-words rounded-[4px] bg-foreground/[0.07] px-1 py-px font-mono text-[0.92em] text-foreground",
        className
      )}
      title={title}
    >
      {children}
    </code>
  );
}
