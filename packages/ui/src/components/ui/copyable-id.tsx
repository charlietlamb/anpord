import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useCopy } from "@anpord/ui/hooks/use-copy";
import { Badge } from "@anpord/ui/components/ui/badge";
import { Button } from "@anpord/ui/components/button";
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
        <Button
          aria-label={copied ? `Copied ${value}` : `Copy ${value}`}
          className="h-auto rounded-[inherit] px-0 py-0 font-normal hover:bg-transparent"
          onClick={() => copy(value)}
          variant="ghost"
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
