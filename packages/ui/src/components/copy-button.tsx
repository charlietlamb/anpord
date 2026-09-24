import { Button } from "@anpord/ui/components/button";
import { useCopy } from "@anpord/ui/hooks/use-copy";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";

export const COPY_RESET_MS = 1500;

export function CopyButton({
  className,
  label = "Copy",
  size = "default",
  value,
}: {
  readonly className?: string;
  readonly label?: string;
  readonly size?: "default" | "inline";
  readonly value: string;
}) {
  const { copied, copy } = useCopy(COPY_RESET_MS);
  const Glyph = copied ? CheckIcon : CopyIcon;

  return (
    <Button
      aria-label={label}
      className={className}
      onClick={() => copy(value)}
      size={size === "inline" ? "icon-xs" : "icon-sm"}
      type="button"
      variant="bare"
    >
      <Glyph />
    </Button>
  );
}
