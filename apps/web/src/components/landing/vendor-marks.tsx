import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactElement } from "react";

export interface Vendor {
  readonly href: string;
  readonly Mark: (props: { readonly className?: string }) => ReactElement;
  readonly name: string;
}

export function VendorMarks({ items }: { readonly items: readonly Vendor[] }) {
  return (
    <span className="inline-flex items-center gap-2">
      {items.map(({ Mark, href, name }) => (
        <Tooltip key={name}>
          <TooltipTrigger
            render={
              <a
                className={cn(
                  "rounded-sm text-muted-foreground/80",
                  "transition-colors duration-200 ease-out hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                href={href}
                rel="noreferrer"
                target="_blank"
              >
                <Mark className="size-4 shrink-0" />
                <span className="sr-only">{name}</span>
              </a>
            }
          />
          <TooltipContent>{name}</TooltipContent>
        </Tooltip>
      ))}
    </span>
  );
}
