"use client";

import { CopyButton } from "@anpord/ui/components/copy-button";
import { useHighlighted } from "@anpord/ui/hooks/use-highlighted";
import type { CodeLanguage } from "@anpord/ui/lib/highlight";
import {
  SURFACE_BODY,
  SURFACE_FRAME,
  SURFACE_HEAD,
} from "@anpord/ui/lib/surface";
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
  return (
    <div className={cn("group/code", SURFACE_FRAME, className)}>
      <div
        className={cn(
          SURFACE_HEAD,
          "flex items-center justify-between gap-2 pr-1 pl-3"
        )}
      >
        <span className="truncate font-mono">{label}</span>

        <CopyButton
          className="size-6 shrink-0 opacity-0 transition-opacity duration-150 ease-out focus-visible:opacity-100 group-hover/code:opacity-100"
          label={`Copy ${label}`}
          value={code}
        />
      </div>

      <div className={SURFACE_BODY}>
        <CodeContent code={code} lang={lang} maxHeight={maxHeight} />
      </div>
    </div>
  );
}

export function CodeContent({
  code,
  lang,
  maxHeight = "max-h-[28rem]",
}: {
  readonly code: string;
  readonly lang: CodeLanguage;
  readonly maxHeight?: string;
}) {
  const html = useHighlighted(code, lang);

  return (
    <div className={cn("overflow-auto", maxHeight)}>
      {html === null ? (
        <pre className="p-4 font-mono text-label text-muted-foreground leading-[1.7] [font-variation-settings:'wght'_450]">
          {code}
        </pre>
      ) : (
        /* Shiki's own markup, which carries both themes: the light colours
           inline and the dark ones as custom properties. */
        <div
          className={cn(
            "[&_pre]:!bg-transparent [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-label [&_pre]:leading-[1.7] [&_pre]:[font-variation-settings:'wght'_450] [&_pre]:[tab-size:2]",
            "[.dark_&_.shiki]:![color:var(--shiki-dark)] [.dark_&_.shiki_span]:![color:var(--shiki-dark)]"
          )}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: markup is produced by shiki from a string this app owns
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
