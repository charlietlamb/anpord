import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useCopy } from "../hooks/use-copy";
import { Button } from "./button";

interface CopyButtonProps {
  className?: string;
  label?: string;
  value: string;
}

export function CopyButton({
  value,
  className,
  label = "Copy",
}: CopyButtonProps) {
  const { copied, copy } = useCopy(2000);
  return (
    <Button
      aria-label={label}
      className={className}
      onClick={() => copy(value)}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </Button>
  );
}
