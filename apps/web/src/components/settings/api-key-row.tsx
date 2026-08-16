import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { useRelativeTime } from "@/lib/use-relative-time";

interface ApiKeyRowProps {
  readonly createdAt: Date | string;
  readonly name: string;
  readonly onRevoke: () => void;
  readonly start: string | null;
}

export function ApiKeyRow({
  createdAt,
  name,
  onRevoke,
  start,
}: ApiKeyRowProps) {
  const created = useRelativeTime(new Date(createdAt));

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium text-sm">{name}</span>
        <span className="font-mono text-muted-foreground text-xs">
          {start ? `${start}…` : "—"}
        </span>
      </div>

      {created ? (
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          created {created}
        </span>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Actions for ${name}`}
              className="size-7 shrink-0"
              size="icon"
              variant="ghost"
            >
              <DotsThreeIcon size={16} weight="bold" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onRevoke}
          >
            Revoke
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
