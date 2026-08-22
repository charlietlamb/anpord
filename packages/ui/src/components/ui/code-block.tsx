import { CopyButton } from "@anpord/ui/components/copy-button";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * Preformatted text on its own ground.
 *
 * One component because five screens had each written their own: same idea,
 * different padding, radius and max height, so a stack trace and a shell
 * script looked like they came from different applications.
 *
 * Takes children rather than a string, so a caller that has tokenised its
 * content can hand over coloured spans and one that has not can pass text.
 * `copyValue` is separate for the same reason: the text to copy is the source,
 * not whatever the children happen to render.
 *
 * The copy button stays mounted and is revealed on hover rather than rendered
 * on it, because a button that only exists while the pointer is over the block
 * is a button no keyboard can reach.
 */
export function CodeBlock({
  children,
  className,
  /** The text a copy button puts on the clipboard. Absent means no button:
   * a block with nothing worth taking away should not offer to give it. */
  copyValue,
  tone = "muted",
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly copyValue?: string;
  /** `muted` for content the reader chose to open; `plain` for content that
   * is the point of the surface it sits on and needs no second background;
   * `inverted` for a surface already painted in the foreground colour, like a
   * tooltip, where every theme token means its opposite. */
  readonly tone?: "inverted" | "muted" | "plain";
}) {
  const block = (
    <pre
      className={cn(
        "max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md px-3 py-2.5 font-mono text-xs leading-relaxed",
        tone === "muted" && "bg-muted/50",
        tone === "inverted" && "bg-current/10",
        copyValue !== undefined && "pr-11",
        className
      )}
    >
      {children}
    </pre>
  );

  if (copyValue === undefined) {
    return block;
  }

  return (
    <div className="group relative">
      {block}
      <CopyButton
        className="absolute top-1.5 right-1.5 opacity-0 transition-opacity duration-150 ease-out focus-visible:opacity-100 group-hover:opacity-100"
        label="Copy"
        value={copyValue}
      />
    </div>
  );
}
