import { Button } from "@anpord/ui/components/button";
import { useCopy } from "@anpord/ui/hooks/use-copy";
import { cn } from "@anpord/ui/lib/utils";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";

interface CopyableIdProps {
  readonly className?: string;
  readonly value: string;
}

/**
 * The identifier is something people paste into code, so it copies itself. It
 * is written as the value it is rather than boxed in a badge: beside other
 * properties, a pill would make the one you cannot edit look like the only one
 * that matters. The icon waits for the pointer, so the row stays a value until
 * there is a reason for it to be a control.
 */
export function CopyableId({ className, value }: CopyableIdProps) {
  const { copied, copy } = useCopy(2000);

  return (
    <Button
      aria-label={copied ? `Copied ${value}` : `Copy ${value}`}
      /* Takes the colour of the row it sits in rather than setting its own, so
         a property and its value cannot light up at different moments. */
      className={cn(
        "group/id -mx-1 h-6 max-w-full justify-start gap-1.5 rounded px-1 font-mono font-normal text-inherit hover:text-inherit",
        className
      )}
      onClick={() => copy(value)}
      variant="bare"
    >
      <span className="truncate">{value}</span>
      {/* The icon holds its place whether or not it is shown, so the value
          beside it cannot shift as the pointer arrives. */}
      {copied ? (
        <CheckIcon className="size-3 shrink-0" />
      ) : (
        <CopyIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover/id:opacity-60 group-focus-visible/id:opacity-60" />
      )}
    </Button>
  );
}
