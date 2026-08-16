import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useCopy } from "@anpord/ui/hooks/use-copy";
import { Badge } from "@anpord/ui/components/ui/badge";
import { cn } from "@anpord/ui/lib/utils";

interface CopyableIdProps {
  readonly className?: string;
  readonly value: string;
}

/** The identifier is something people paste into code, so it copies itself. */
export function CopyableId({ className, value }: CopyableIdProps) {
  const { copied, copy } = useCopy(2000);

  return (
    <Badge
      className={cn(
        "cursor-pointer font-mono hover:bg-muted hover:text-foreground",
        className
      )}
      render={
        <button
          aria-label={copied ? `Copied ${value}` : `Copy ${value}`}
          onClick={() => copy(value)}
          type="button"
        />
      }
      size="sm"
      variant="outline"
    >
      {value}
      {copied ? (
        <CheckIcon className="size-3 opacity-70" />
      ) : (
        <CopyIcon className="size-3 opacity-50" />
      )}
    </Badge>
  );
}
