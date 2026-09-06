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
