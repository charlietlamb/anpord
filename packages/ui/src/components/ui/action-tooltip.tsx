import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { Kbd } from "@anpord/ui/components/ui/kbd";
import { useMetaKeyLabel } from "@anpord/ui/hooks/use-meta-key-label";
import type { ReactElement, ReactNode } from "react";

interface ActionTooltipProps {
  readonly children: ReactElement;
  readonly label: ReactNode;
  readonly metaShortcut?: string;
}

export function ActionTooltip({
  children,
  label,
  metaShortcut,
}: ActionTooltipProps) {
  const meta = useMetaKeyLabel();

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="flex items-center gap-1.5">
        {label}
        {metaShortcut ? (
          <span className="flex items-center gap-0.5">
            <Kbd>{meta}</Kbd>
            <Kbd>{metaShortcut === "enter" ? "↵" : metaShortcut}</Kbd>
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
