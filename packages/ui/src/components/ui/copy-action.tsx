import { Button } from "@anpord/ui/components/button";
import { ActionTooltip } from "@anpord/ui/components/ui/action-tooltip";
import { useCopy } from "@anpord/ui/hooks/use-copy";
import { CheckIcon, type Icon } from "@phosphor-icons/react";

interface CopyActionProps {
  /** Reported once the value is on the clipboard, so the tooltip confirms
   * rather than repeating an offer already taken. */
  readonly copiedLabel: string;
  readonly icon: Icon;
  readonly label: string;
  /** A function where the value is only knowable in the browser, such as the
   * address of the page being read. */
  readonly value: string | (() => string);
}

/**
 * Copies one value, and names which. A control showing only an icon has to say
 * what it does somewhere, and with nothing on screen changing, the tooltip is
 * also what confirms the click landed.
 */
export function CopyAction({
  copiedLabel,
  icon: ActionIcon,
  label,
  value,
}: CopyActionProps) {
  /** Long enough to register, short enough that the control is back to what it
   * does before you look again. */
  const { copied, copy } = useCopy(1000);

  return (
    <ActionTooltip label={copied ? copiedLabel : label}>
      <Button
        aria-label={label}
        onClick={() => copy(typeof value === "function" ? value() : value)}
        size="icon-round"
        variant="subtle"
      >
        {copied ? <CheckIcon weight="bold" /> : <ActionIcon />}
      </Button>
    </ActionTooltip>
  );
}
