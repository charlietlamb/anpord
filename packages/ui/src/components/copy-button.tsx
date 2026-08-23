import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useCopy } from "../hooks/use-copy";
import { cn } from "../lib/utils";
import { Button } from "./button";

interface CopyButtonProps {
  className?: string;
  label?: string;
  /** `inline` sits in a line of text rather than floating over a block, so it
   * matches the type beside it instead of the padding around it. */
  size?: "default" | "inline";
  value: string;
}

export function CopyButton({
  value,
  className,
  label = "Copy",
  size = "default",
}: CopyButtonProps) {
  const { copied, copy } = useCopy(2000);
  const inline = size === "inline";
  const Glyph = copied ? CheckIcon : CopyIcon;

  return (
    <Button
      aria-label={label}
      className={cn(inline && "size-5", className)}
      onClick={() => copy(value)}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <Glyph className={inline ? "size-3.5" : "size-4"} />
    </Button>
  );
}
