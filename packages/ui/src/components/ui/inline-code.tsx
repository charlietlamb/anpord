import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

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
