import { Button } from "@anpord/ui/components/button";
import { ActionTooltip } from "@anpord/ui/components/ui/action-tooltip";
import { useCopy } from "@anpord/ui/hooks/use-copy";
import { CheckIcon, type Icon } from "@phosphor-icons/react";

interface CopyActionProps {
  readonly copiedLabel: string;
  readonly icon: Icon;
  readonly label: string;
  readonly value: string | (() => string);
}

export function CopyAction({
  copiedLabel,
  icon: ActionIcon,
  label,
  value,
}: CopyActionProps) {
  const { copied, copy } = useCopy(1000);

  return (
    <ActionTooltip label={copied ? copiedLabel : label}>
      <Button
        aria-label={label}
        onClick={() => copy(typeof value === "function" ? value() : value)}
        size="icon-round"
        variant="subtle"
      >
        {copied ? <CheckIcon /> : <ActionIcon />}
      </Button>
    </ActionTooltip>
  );
}
