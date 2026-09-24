import { CopyButton } from "@anpord/ui/components/copy-button";
import { SURFACE_FILL } from "@anpord/ui/lib/surface";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

export function CodeBlock({
  children,
  className,
  copyValue,
  tone = "muted",
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly copyValue?: string;
  readonly tone?: "inverted" | "muted" | "plain";
}) {
  const block = (
    <pre
      className={cn(
        "max-h-64 overflow-auto rounded-lg px-3 py-2.5 font-mono text-label leading-[1.7] [font-variation-settings:'wght'_450] [tab-size:2]",
        tone === "muted" && SURFACE_FILL,
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
