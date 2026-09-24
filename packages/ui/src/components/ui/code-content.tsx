"use client";

import { useHighlighted } from "@anpord/ui/hooks/use-highlighted";
import type { CodeLanguage } from "@anpord/ui/lib/highlight";
import { cn } from "@anpord/ui/lib/utils";

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
