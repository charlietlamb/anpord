import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import type { ReactNode } from "react";

interface SignalTipProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly label: ReactNode;
}

/**
 * A compact figure that can say the whole thing when asked.
 *
 * A list row has space for `1m` but not for the exact seconds, and for `8h`
 * but not the date. Rather than choose, the short form holds the column and
 * the full one waits under the pointer.
 */
export function SignalTip({ children, className, label }: SignalTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger className={className} render={<span />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
