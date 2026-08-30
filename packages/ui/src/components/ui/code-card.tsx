"use client";

import { CopyButton } from "@anpord/ui/components/copy-button";
import { useHighlighted } from "@anpord/ui/hooks/use-highlighted";
import type { CodeLanguage } from "@anpord/ui/lib/highlight";
import { cn } from "@anpord/ui/lib/utils";

/**
 * A block of code, coloured, with somewhere to put its name.
 *
 * The label is the file it belongs in or the language it is written in --
 * the one fact a reader needs before deciding whether to read the rest.
 * Colour arrives a moment after the text, which is the right order: the code
 * is legible immediately and only its highlighting waits on a wasm engine.
 */
export function CodeCard({
  className,
  code,
  label,
  lang,
  maxHeight = "max-h-[28rem]",
}: {
  readonly className?: string;
  readonly code: string;
  readonly label: string;
  readonly lang: CodeLanguage;
  /** Bounded so a long file does not push the page it sits on out of shape. */
  readonly maxHeight?: string;
}) {
  const html = useHighlighted(code, lang);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border-faint bg-muted/40",
        className
      )}
    >
      <div className="flex h-10 items-center justify-between gap-2 pr-2 pl-4 shadow-[inset_0_-1px_0_0] shadow-border-faint">
        <span className="truncate font-mono text-muted-foreground text-xs">
          {label}
        </span>

        <CopyButton
          className="size-6 shrink-0"
          label={`Copy ${label}`}
          value={code}
        />
      </div>

      <div className={cn("overflow-auto", maxHeight)}>
        {html === null ? (
          <pre className="p-4 font-mono text-muted-foreground text-xs leading-relaxed">
            {code}
          </pre>
        ) : (
          /* Shiki's own markup, which carries both themes: the light colours
             inline and the dark ones as custom properties. */
          <div
            className={cn(
              "[&_pre]:!bg-transparent [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed",
              "[.dark_&_.shiki]:![color:var(--shiki-dark)] [.dark_&_.shiki_span]:![color:var(--shiki-dark)]"
            )}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: markup is produced by shiki from a string this app owns
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}
