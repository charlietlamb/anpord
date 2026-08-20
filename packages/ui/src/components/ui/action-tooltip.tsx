import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { Kbd } from "@anpord/ui/components/ui/kbd";
import { useMetaKeyLabel } from "@anpord/ui/hooks/use-meta-key-label";
import type { ReactElement, ReactNode } from "react";

interface ActionTooltipProps {
  /** The control itself, rendered as the trigger. */
  readonly children: ReactElement;
  readonly label: ReactNode;
  /** Pressed with the platform's meta key, when the action has a shortcut. */
  readonly metaShortcut?: string;
}

/**
 * Names an action whose control shows only an icon, and states its shortcut
 * where it has one — so the keystroke is discoverable without a label taking
 * up room on the page.
 */
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
